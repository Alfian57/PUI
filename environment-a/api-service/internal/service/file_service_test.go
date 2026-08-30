package service

import (
	"bytes"
	"context"
	"errors"
	"io"
	"strings"
	"testing"
	"time"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"github.com/alfiang/pui/environment-a/api-service/internal/vaultclient"
)

const (
	testUserID = "11111111-1111-1111-1111-111111111111"
	testFileID = "22222222-2222-4222-8222-222222222222"
)

func TestFileServiceUploadCommitsPendingMetadata(t *testing.T) {
	t.Parallel()

	files := newFakeFileRepo()
	vault := &fakeVaultClient{
		uploadResult: vaultclient.UploadCommitResult{
			ManifestID:      strings.Repeat("a", 64),
			FileHash:        strings.Repeat("a", 64),
			TotalSizeBytes:  12,
			ChunkCount:      3,
			NewChunkCount:   2,
			ReuseChunkCount: 1,
			DedupRatio:      1.0 / 3.0,
			Immutable:       true,
		},
	}
	activity := &fakeActivityLogger{}
	svc := NewFileService(files, fakeDirectoryRepo{}, activity, vault)

	outcome, err := svc.Upload(context.Background(), testUser(), "", "backup.txt", "text/plain", strings.NewReader("hello backup"))
	if err != nil {
		t.Fatalf("upload: %v", err)
	}

	if outcome.File.ID == "" {
		t.Fatalf("expected committed file id")
	}
	if outcome.File.StorageStatus != "committed" {
		t.Fatalf("expected committed status, got %s", outcome.File.StorageStatus)
	}
	if outcome.File.ManifestID != vault.uploadResult.ManifestID {
		t.Fatalf("manifest id mismatch")
	}
	if outcome.File.SizeBytes != vault.uploadResult.TotalSizeBytes {
		t.Fatalf("size mismatch")
	}
	if files.failedCount != 0 {
		t.Fatalf("did not expect failed metadata marks")
	}
	if !activity.contains("UPLOAD") {
		t.Fatalf("expected upload activity log")
	}
}

func TestFileServiceUploadFailureMarksPendingMetadataFailed(t *testing.T) {
	t.Parallel()

	files := newFakeFileRepo()
	vaultErr := errors.New("injected vault failure")
	activity := &fakeActivityLogger{}
	svc := NewFileService(files, fakeDirectoryRepo{}, activity, &fakeVaultClient{uploadErr: vaultErr})

	if _, err := svc.Upload(context.Background(), testUser(), "", "broken.txt", "text/plain", strings.NewReader("partial")); !errors.Is(err, vaultErr) {
		t.Fatalf("expected vault error, got %v", err)
	}

	if files.failedCount != 1 {
		t.Fatalf("expected one failed metadata mark, got %d", files.failedCount)
	}
	if record := files.records[testFileID]; record.StorageStatus != "failed" {
		t.Fatalf("expected failed status, got %s", record.StorageStatus)
	}
	if _, err := svc.Detail(context.Background(), testUser(), testFileID, true); !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("expected failed metadata to be hidden from detail, got %v", err)
	}
	if !activity.contains("UPLOAD_FAILED") {
		t.Fatalf("expected upload failed activity log")
	}
}

func TestFileServiceDownloadReconstructsObjectFromManifestChunks(t *testing.T) {
	t.Parallel()

	chunks := [][]byte{
		[]byte("chunk-one-"),
		[]byte("chunk-two"),
	}
	payload := bytes.Join(chunks, nil)
	manifestID := strings.Repeat("a", 64)

	files := newFakeFileRepo()
	files.records[testFileID] = domain.FileRecord{
		ID:            testFileID,
		Name:          "restored.txt",
		SizeBytes:     int64(len(payload)),
		MIMEType:      "text/plain",
		ManifestID:    manifestID,
		StorageStatus: "committed",
		CreatedAt:     time.Now().UTC(),
	}
	activity := &fakeActivityLogger{}
	svc := NewFileService(files, fakeDirectoryRepo{}, activity, &fakeVaultClient{
		downloadBody:   payload,
		downloadLength: int64(len(payload)),
	})

	outcome, err := svc.Download(context.Background(), testUser(), testFileID, false)
	if err != nil {
		t.Fatalf("download: %v", err)
	}
	defer outcome.Body.Close()

	reconstructed, err := io.ReadAll(outcome.Body)
	if err != nil {
		t.Fatalf("read reconstructed body: %v", err)
	}
	if !bytes.Equal(reconstructed, bytes.Join(chunks, nil)) {
		t.Fatalf("reconstructed payload mismatch")
	}
	if outcome.ContentLength != int64(len(reconstructed)) {
		t.Fatalf("content length mismatch")
	}
	if !activity.contains("DOWNLOAD") {
		t.Fatalf("expected download activity log")
	}
}

func TestFileServiceDownloadReturnsVaultObjectError(t *testing.T) {
	t.Parallel()

	vaultErr := errors.New("vault object unavailable")

	files := newFakeFileRepo()
	files.records[testFileID] = domain.FileRecord{
		ID:            testFileID,
		Name:          "missing.bin",
		SizeBytes:     15,
		MIMEType:      "application/octet-stream",
		ManifestID:    strings.Repeat("b", 64),
		StorageStatus: "committed",
		CreatedAt:     time.Now().UTC(),
	}
	svc := NewFileService(files, fakeDirectoryRepo{}, &fakeActivityLogger{}, &fakeVaultClient{downloadErr: vaultErr})

	if _, err := svc.Download(context.Background(), testUser(), testFileID, false); !errors.Is(err, vaultErr) {
		t.Fatalf("expected vault object error, got %v", err)
	}
}

func TestFileServiceSoftDeleteAndRestoreOnlyChangeLogicalMetadata(t *testing.T) {
	t.Parallel()

	files := newFakeFileRepo()
	files.records[testFileID] = domain.FileRecord{
		ID:            testFileID,
		Name:          "logical-delete.txt",
		SizeBytes:     10,
		MIMEType:      "text/plain",
		ManifestID:    strings.Repeat("c", 64),
		StorageStatus: "committed",
		CreatedAt:     time.Now().UTC(),
	}
	activity := &fakeActivityLogger{}
	svc := NewFileService(files, fakeDirectoryRepo{}, activity, &fakeVaultClient{})

	if _, err := svc.SoftDelete(context.Background(), testUser(), testFileID); err != nil {
		t.Fatalf("soft delete: %v", err)
	}
	if _, err := svc.Detail(context.Background(), testUser(), testFileID, false); !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("expected soft-deleted file hidden without includeDeleted, got %v", err)
	}

	restored, err := svc.Restore(context.Background(), testUser(), testFileID)
	if err != nil {
		t.Fatalf("restore: %v", err)
	}
	if restored.DeletedAt != nil {
		t.Fatalf("expected restored file to clear deleted_at")
	}
	if _, err := svc.Detail(context.Background(), testUser(), testFileID, false); err != nil {
		t.Fatalf("detail after restore: %v", err)
	}
	if !activity.contains("DELETE_SOFT") || !activity.contains("RESTORE_FILE") {
		t.Fatalf("expected delete and restore activity logs, got %#v", activity.actions)
	}
}

func testUser() domain.AuthUser {
	return domain.AuthUser{UserID: testUserID, Role: "user"}
}

type fakeVaultClient struct {
	uploadResult   vaultclient.UploadCommitResult
	uploadErr      error
	manifests      map[string]vaultclient.ManifestRecord
	manifestErr    error
	downloadBody   []byte
	downloadLength int64
	downloadErr    error
}

func (f *fakeVaultClient) Upload(ctx context.Context, fileName string, reader io.Reader) (vaultclient.UploadCommitResult, error) {
	if f.uploadErr != nil {
		return vaultclient.UploadCommitResult{}, f.uploadErr
	}
	if _, err := io.Copy(io.Discard, reader); err != nil {
		return vaultclient.UploadCommitResult{}, err
	}
	return f.uploadResult, nil
}

func (f *fakeVaultClient) GetManifest(ctx context.Context, manifestID string) (vaultclient.ManifestRecord, error) {
	if f.manifestErr != nil {
		return vaultclient.ManifestRecord{}, f.manifestErr
	}
	manifest, ok := f.manifests[manifestID]
	if !ok {
		return vaultclient.ManifestRecord{}, domain.ErrNotFound
	}
	return manifest, nil
}

func (f *fakeVaultClient) DownloadObject(ctx context.Context, manifestID string) (io.ReadCloser, int64, error) {
	if f.downloadErr != nil {
		return nil, 0, f.downloadErr
	}
	return io.NopCloser(bytes.NewReader(f.downloadBody)), f.downloadLength, nil
}

type fakeDirectoryRepo struct{}

func (fakeDirectoryRepo) IsOwnedByUser(ctx context.Context, directoryID, userID string) (bool, error) {
	return true, nil
}

func (fakeDirectoryRepo) IsOwnedByUserIncludingDeleted(ctx context.Context, directoryID, userID string) (bool, error) {
	return true, nil
}

type fakeActivityLogger struct {
	actions []string
}

func (f *fakeActivityLogger) Log(ctx context.Context, userID, action, resourceType string, resourceID *string) error {
	f.actions = append(f.actions, action)
	return nil
}

func (f *fakeActivityLogger) contains(action string) bool {
	for _, existing := range f.actions {
		if existing == action {
			return true
		}
	}
	return false
}

type fakeFileRepo struct {
	records     map[string]domain.FileRecord
	failedCount int
}

func newFakeFileRepo() *fakeFileRepo {
	return &fakeFileRepo{records: make(map[string]domain.FileRecord)}
}

func (f *fakeFileRepo) ListByDirectory(ctx context.Context, userID, directoryID string, includeDeleted bool) ([]domain.FileRecord, error) {
	out := make([]domain.FileRecord, 0, len(f.records))
	for _, record := range f.records {
		if record.StorageStatus != "committed" {
			continue
		}
		if record.DeletedAt != nil && !includeDeleted {
			continue
		}
		out = append(out, record)
	}
	return out, nil
}

func (f *fakeFileRepo) ListByDirectoryPage(ctx context.Context, userID string, filter domain.FileListFilter) ([]domain.FileRecord, int64, domain.FileListStats, error) {
	items, err := f.ListByDirectory(ctx, userID, filter.DirectoryID, filter.IncludeDeleted)
	if err != nil {
		return nil, 0, domain.FileListStats{}, err
	}

	stats := domain.FileListStats{}
	for _, item := range items {
		stats.TotalBytes += item.SizeBytes
		stats.TotalChunks += item.ChunkCount
		stats.ReusedChunks += item.ReuseChunks
	}

	return items, int64(len(items)), stats, nil
}

func (f *fakeFileRepo) CreatePending(ctx context.Context, userID, directoryID, name, mimeType string) (domain.FileRecord, error) {
	record := domain.FileRecord{
		ID:            testFileID,
		Name:          name,
		SizeBytes:     0,
		MIMEType:      mimeType,
		ManifestID:    "",
		StorageStatus: "pending",
		CreatedAt:     time.Now().UTC(),
	}
	f.records[record.ID] = record
	return record, nil
}

func (f *fakeFileRepo) MarkCommitted(ctx context.Context, fileID, userID string, result vaultclient.UploadCommitResult) (domain.FileRecord, error) {
	record, ok := f.records[fileID]
	if !ok || record.StorageStatus != "pending" {
		return domain.FileRecord{}, domain.ErrNotFound
	}
	record.SizeBytes = result.TotalSizeBytes
	record.ManifestID = result.ManifestID
	record.StorageStatus = "committed"
	record.ChunkCount = result.ChunkCount
	record.NewChunks = result.NewChunkCount
	record.ReuseChunks = result.ReuseChunkCount
	record.DedupRatio = result.DedupRatio
	record.CreatedAt = time.Now().UTC()
	f.records[fileID] = record
	return record, nil
}

func (f *fakeFileRepo) RequeueManifestRetirement(ctx context.Context, manifestID string) error {
	return nil
}

func (f *fakeFileRepo) MarkFailed(ctx context.Context, fileID, userID string) error {
	record, ok := f.records[fileID]
	if !ok {
		return domain.ErrNotFound
	}
	record.StorageStatus = "failed"
	f.records[fileID] = record
	f.failedCount++
	return nil
}

func (f *fakeFileRepo) FindByIDForUser(ctx context.Context, fileID, userID string, includeDeleted bool) (domain.FileRecord, error) {
	record, ok := f.records[fileID]
	if !ok || record.StorageStatus != "committed" {
		return domain.FileRecord{}, domain.ErrNotFound
	}
	if record.DeletedAt != nil && !includeDeleted {
		return domain.FileRecord{}, domain.ErrNotFound
	}
	return record, nil
}

func (f *fakeFileRepo) SoftDelete(ctx context.Context, fileID, userID string) (time.Time, error) {
	record, ok := f.records[fileID]
	if !ok || record.StorageStatus != "committed" || record.DeletedAt != nil {
		return time.Time{}, domain.ErrNotFound
	}
	deletedAt := time.Now().UTC()
	record.DeletedAt = &deletedAt
	f.records[fileID] = record
	return deletedAt, nil
}

func (f *fakeFileRepo) Restore(ctx context.Context, fileID, userID string) (domain.FileRecord, error) {
	record, ok := f.records[fileID]
	if !ok || record.StorageStatus != "committed" || record.DeletedAt == nil {
		return domain.FileRecord{}, domain.ErrNotFound
	}
	record.DeletedAt = nil
	f.records[fileID] = record
	return record, nil
}

func (f *fakeFileRepo) PermanentDelete(ctx context.Context, fileID, userID string) error {
	record, ok := f.records[fileID]
	if !ok || record.DeletedAt == nil {
		return domain.ErrNotFound
	}
	delete(f.records, fileID)
	return nil
}

func (f *fakeFileRepo) SetStarred(ctx context.Context, fileID, userID string, starred bool) (domain.FileRecord, error) {
	record, ok := f.records[fileID]
	if !ok || record.StorageStatus != "committed" {
		return domain.FileRecord{}, domain.ErrNotFound
	}
	if starred {
		now := time.Now().UTC()
		record.StarredAt = &now
	} else {
		record.StarredAt = nil
	}
	f.records[fileID] = record
	return record, nil
}

func (f *fakeFileRepo) ExistsActiveByDirectoryAndName(ctx context.Context, userID, directoryID, name string) (bool, error) {
	for _, record := range f.records {
		if record.DeletedAt == nil && (record.StorageStatus == "pending" || record.StorageStatus == "committed") && strings.EqualFold(record.Name, name) {
			return true, nil
		}
	}
	return false, nil
}

func (f *fakeFileRepo) SearchByUser(ctx context.Context, userID string, filter domain.FileSearchFilter) ([]domain.FileRecord, int64, error) {
	return nil, 0, nil
}

func (f *fakeFileRepo) ListTrash(ctx context.Context, userID string) ([]domain.FileRecord, error) {
	return nil, nil
}

func (f *fakeFileRepo) ListStarred(ctx context.Context, userID string) ([]domain.FileRecord, error) {
	return nil, nil
}

func (f *fakeFileRepo) ListTrashPage(ctx context.Context, userID string, limit, offset int) ([]domain.FileRecord, int64, error) {
	return nil, 0, nil
}

func (f *fakeFileRepo) ListStarredPage(ctx context.Context, userID string, limit, offset int) ([]domain.FileRecord, int64, error) {
	return nil, 0, nil
}

func (f *fakeFileRepo) ExpireStalePending(_ context.Context, _ time.Time) (int64, error) {
	return 0, nil
}
