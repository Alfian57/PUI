package service

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"github.com/alfiang/pui/environment-a/api-service/internal/vaultclient"
	"github.com/zeebo/blake3"
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
	svc := NewFileService(files, fakeDirectoryRepo{}, activity, vault, t.TempDir())

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
	svc := NewFileService(files, fakeDirectoryRepo{}, activity, &fakeVaultClient{uploadErr: vaultErr}, t.TempDir())

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

	chunkRoot := t.TempDir()
	chunks := [][]byte{
		[]byte("chunk-one-"),
		[]byte("chunk-two"),
	}
	manifest := writeChunksAndManifest(t, chunkRoot, chunks)

	files := newFakeFileRepo()
	files.records[testFileID] = domain.FileRecord{
		ID:            testFileID,
		Name:          "restored.txt",
		SizeBytes:     manifest.TotalSizeBytes,
		MIMEType:      "text/plain",
		ManifestID:    manifest.ManifestID,
		StorageStatus: "committed",
		CreatedAt:     time.Now().UTC(),
	}
	activity := &fakeActivityLogger{}
	svc := NewFileService(files, fakeDirectoryRepo{}, activity, &fakeVaultClient{manifests: map[string]vaultclient.ManifestRecord{
		manifest.ManifestID: manifest,
	}}, chunkRoot)

	outcome, err := svc.Download(context.Background(), testUser(), testFileID, false)
	if err != nil {
		t.Fatalf("download: %v", err)
	}
	defer outcome.Body.Close()

	payload, err := io.ReadAll(outcome.Body)
	if err != nil {
		t.Fatalf("read reconstructed body: %v", err)
	}
	if !bytes.Equal(payload, bytes.Join(chunks, nil)) {
		t.Fatalf("reconstructed payload mismatch")
	}
	if outcome.ContentLength != manifest.TotalSizeBytes {
		t.Fatalf("content length mismatch")
	}
	if !activity.contains("DOWNLOAD") {
		t.Fatalf("expected download activity log")
	}
}

func TestFileServiceDownloadRejectsInvalidManifestOrMissingChunk(t *testing.T) {
	t.Parallel()

	chunkRoot := t.TempDir()
	chunk := []byte("available chunk")
	manifest := writeChunksAndManifest(t, chunkRoot, [][]byte{chunk})
	manifest.ChunkHashes = []string{strings.Repeat("b", 64)}

	files := newFakeFileRepo()
	files.records[testFileID] = domain.FileRecord{
		ID:            testFileID,
		Name:          "missing.bin",
		SizeBytes:     int64(len(chunk)),
		MIMEType:      "application/octet-stream",
		ManifestID:    manifest.ManifestID,
		StorageStatus: "committed",
		CreatedAt:     time.Now().UTC(),
	}
	svc := NewFileService(files, fakeDirectoryRepo{}, &fakeActivityLogger{}, &fakeVaultClient{manifests: map[string]vaultclient.ManifestRecord{
		manifest.ManifestID: manifest,
	}}, chunkRoot)

	if _, err := svc.Download(context.Background(), testUser(), testFileID, false); err == nil {
		t.Fatalf("expected download error for missing chunk")
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
	svc := NewFileService(files, fakeDirectoryRepo{}, activity, &fakeVaultClient{}, t.TempDir())

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

func writeChunksAndManifest(t *testing.T, chunkRoot string, chunks [][]byte) vaultclient.ManifestRecord {
	t.Helper()

	fileHasher := blake3.New()
	hashes := make([]string, 0, len(chunks))
	var total int64
	for _, chunk := range chunks {
		if _, err := fileHasher.Write(chunk); err != nil {
			t.Fatalf("hash file chunk: %v", err)
		}
		sum := blake3.Sum256(chunk)
		chunkHash := fmt.Sprintf("%x", sum[:])
		hashes = append(hashes, chunkHash)
		total += int64(len(chunk))

		chunkPath := filepath.Join(chunkRoot, chunkHash[0:2], chunkHash[2:4], chunkHash+".bin")
		if err := os.MkdirAll(filepath.Dir(chunkPath), 0o750); err != nil {
			t.Fatalf("mkdir chunk path: %v", err)
		}
		if err := os.WriteFile(chunkPath, chunk, 0o640); err != nil {
			t.Fatalf("write chunk: %v", err)
		}
	}

	fileHash := fmt.Sprintf("%x", fileHasher.Sum(nil))
	return vaultclient.ManifestRecord{
		ManifestID:     fileHash,
		FileHash:       fileHash,
		ChunkHashes:    hashes,
		TotalSizeBytes: total,
		ChunkCount:     len(hashes),
		CreatedAt:      time.Now().UTC(),
		Immutable:      true,
	}
}

type fakeVaultClient struct {
	uploadResult vaultclient.UploadCommitResult
	uploadErr    error
	manifests    map[string]vaultclient.ManifestRecord
	manifestErr  error
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

type fakeDirectoryRepo struct{}

func (fakeDirectoryRepo) IsOwnedByUser(ctx context.Context, directoryID, userID string) (bool, error) {
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
