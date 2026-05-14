package service

import (
	"context"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"github.com/alfiang/pui/environment-a/api-service/internal/vaultclient"
	"github.com/zeebo/blake3"
)

const (
	defaultFileSearchLimit = 20
	maxFileSearchLimit     = 200
)

type VaultFileClient interface {
	Upload(ctx context.Context, fileName string, reader io.Reader) (vaultclient.UploadCommitResult, error)
	GetManifest(ctx context.Context, manifestID string) (vaultclient.ManifestRecord, error)
}

type fileMetadataRepository interface {
	ListByDirectory(ctx context.Context, userID, directoryID string, includeDeleted bool) ([]domain.FileRecord, error)
	CreatePending(ctx context.Context, userID, directoryID, name, mimeType string) (domain.FileRecord, error)
	MarkCommitted(ctx context.Context, fileID, userID string, result vaultclient.UploadCommitResult) (domain.FileRecord, error)
	MarkFailed(ctx context.Context, fileID, userID string) error
	FindByIDForUser(ctx context.Context, fileID, userID string, includeDeleted bool) (domain.FileRecord, error)
	SoftDelete(ctx context.Context, fileID, userID string) (time.Time, error)
	Restore(ctx context.Context, fileID, userID string) (domain.FileRecord, error)
	PermanentDelete(ctx context.Context, fileID, userID string) error
	SetStarred(ctx context.Context, fileID, userID string, starred bool) (domain.FileRecord, error)
	ExistsActiveByDirectoryAndName(ctx context.Context, userID, directoryID, name string) (bool, error)
	SearchByUser(ctx context.Context, userID string, filter domain.FileSearchFilter) ([]domain.FileRecord, int64, error)
	ListTrash(ctx context.Context, userID string) ([]domain.FileRecord, error)
	ListStarred(ctx context.Context, userID string) ([]domain.FileRecord, error)
}

type directoryOwnershipRepository interface {
	IsOwnedByUser(ctx context.Context, directoryID, userID string) (bool, error)
}

type activityLogger interface {
	Log(ctx context.Context, userID, action, resourceType string, resourceID *string) error
}

type UploadOutcome struct {
	File               domain.FileRecord              `json:"file"`
	UploadCommitResult vaultclient.UploadCommitResult `json:"upload_commit_result"`
}

type DownloadOutcome struct {
	File          domain.FileRecord
	Body          io.ReadCloser
	ContentLength int64
}

type FileService struct {
	filesRepo     fileMetadataRepository
	directoryRepo directoryOwnershipRepository
	activityRepo  activityLogger
	vault         VaultFileClient
	chunkRoot     string
}

func NewFileService(filesRepo fileMetadataRepository, directoryRepo directoryOwnershipRepository, activityRepo activityLogger, vault VaultFileClient, chunkRoot string) *FileService {
	return &FileService{
		filesRepo:     filesRepo,
		directoryRepo: directoryRepo,
		activityRepo:  activityRepo,
		vault:         vault,
		chunkRoot:     filepath.Clean(strings.TrimSpace(chunkRoot)),
	}
}

func (s *FileService) ListByDirectory(ctx context.Context, user domain.AuthUser, directoryID string, includeDeleted bool) ([]domain.FileRecord, error) {
	directoryID = strings.TrimSpace(directoryID)
	if directoryID == "" {
		return s.filesRepo.ListByDirectory(ctx, user.UserID, "", includeDeleted)
	}

	if !IsUUID(directoryID) {
		return nil, domain.NewValidationError("directory id tidak valid")
	}

	owned, err := s.directoryRepo.IsOwnedByUser(ctx, directoryID, user.UserID)
	if err != nil {
		return nil, err
	}
	if !owned {
		return nil, domain.ErrNotFound
	}

	return s.filesRepo.ListByDirectory(ctx, user.UserID, directoryID, includeDeleted)
}

func (s *FileService) Upload(ctx context.Context, user domain.AuthUser, directoryID, fileName, mimeType string, reader io.Reader) (UploadOutcome, error) {
	directoryID = strings.TrimSpace(directoryID)
	var activityResourceID *string

	if directoryID != "" {
		if !IsUUID(directoryID) {
			return UploadOutcome{}, domain.NewValidationError("directory_id tidak valid")
		}

		owned, err := s.directoryRepo.IsOwnedByUser(ctx, directoryID, user.UserID)
		if err != nil {
			return UploadOutcome{}, err
		}
		if !owned {
			return UploadOutcome{}, domain.ErrNotFound
		}
		activityResourceID = &directoryID
	}

	fileName = strings.TrimSpace(fileName)
	if fileName == "" {
		fileName = "upload.bin"
	}

	exists, err := s.filesRepo.ExistsActiveByDirectoryAndName(ctx, user.UserID, directoryID, fileName)
	if err != nil {
		return UploadOutcome{}, err
	}
	if exists {
		return UploadOutcome{}, fmt.Errorf("%w: nama berkas sudah ada pada direktori", domain.ErrConflict)
	}

	mimeType = strings.TrimSpace(mimeType)
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	pendingRecord, err := s.filesRepo.CreatePending(ctx, user.UserID, directoryID, fileName, mimeType)
	if err != nil {
		return UploadOutcome{}, fmt.Errorf("simpan metadata pending berkas gagal: %w", err)
	}

	uploadResult, err := s.vault.Upload(ctx, fileName, reader)
	if err != nil {
		_ = s.filesRepo.MarkFailed(ctx, pendingRecord.ID, user.UserID)
		if logErr := s.activityRepo.Log(ctx, user.UserID, "UPLOAD_FAILED", "DIRECTORY", activityResourceID); logErr != nil {
			// Ignore logging errors to keep root cause intact.
		}
		return UploadOutcome{}, err
	}

	record, err := s.filesRepo.MarkCommitted(ctx, pendingRecord.ID, user.UserID, uploadResult)
	if err != nil {
		_ = s.filesRepo.MarkFailed(ctx, pendingRecord.ID, user.UserID)
		return UploadOutcome{}, fmt.Errorf("simpan metadata berkas gagal: %w", err)
	}

	if logErr := s.activityRepo.Log(ctx, user.UserID, "UPLOAD", "FILE", &record.ID); logErr != nil {
		// Keep upload response successful even when audit log fails.
	}

	return UploadOutcome{File: record, UploadCommitResult: uploadResult}, nil
}

func (s *FileService) Detail(ctx context.Context, user domain.AuthUser, fileID string, includeDeleted bool) (domain.FileRecord, error) {
	if !IsUUID(fileID) {
		return domain.FileRecord{}, domain.NewValidationError("id berkas tidak valid")
	}

	return s.filesRepo.FindByIDForUser(ctx, fileID, user.UserID, includeDeleted)
}

func (s *FileService) Download(ctx context.Context, user domain.AuthUser, fileID string, includeDeleted bool) (DownloadOutcome, error) {
	record, err := s.Detail(ctx, user, fileID, includeDeleted)
	if err != nil {
		return DownloadOutcome{}, err
	}

	body, contentLength, err := s.openObjectFromChunks(ctx, record.ManifestID)
	if err != nil {
		return DownloadOutcome{}, err
	}

	if contentLength >= 0 && contentLength != record.SizeBytes {
		_ = body.Close()
		return DownloadOutcome{}, fmt.Errorf("ukuran objek vault tidak sesuai metadata berkas")
	}

	if logErr := s.activityRepo.Log(ctx, user.UserID, "DOWNLOAD", "FILE", &record.ID); logErr != nil {
		// Do not fail successful download stream due to audit error.
	}

	return DownloadOutcome{File: record, Body: body, ContentLength: contentLength}, nil
}

func (s *FileService) SoftDelete(ctx context.Context, user domain.AuthUser, fileID string) (time.Time, error) {
	if !IsUUID(fileID) {
		return time.Time{}, domain.NewValidationError("id berkas tidak valid")
	}

	deletedAt, err := s.filesRepo.SoftDelete(ctx, fileID, user.UserID)
	if err != nil {
		return time.Time{}, err
	}

	if logErr := s.activityRepo.Log(ctx, user.UserID, "DELETE_SOFT", "FILE", &fileID); logErr != nil {
		// Ignore log write error.
	}

	return deletedAt, nil
}

func (s *FileService) Restore(ctx context.Context, user domain.AuthUser, fileID string) (domain.FileRecord, error) {
	if !IsUUID(fileID) {
		return domain.FileRecord{}, domain.NewValidationError("id berkas tidak valid")
	}

	record, err := s.filesRepo.Restore(ctx, fileID, user.UserID)
	if err != nil {
		return domain.FileRecord{}, err
	}

	if logErr := s.activityRepo.Log(ctx, user.UserID, "RESTORE_FILE", "FILE", &fileID); logErr != nil {
		// Ignore log write error.
	}

	return record, nil
}

func (s *FileService) PermanentDelete(ctx context.Context, user domain.AuthUser, fileID string) error {
	if !IsUUID(fileID) {
		return domain.NewValidationError("id berkas tidak valid")
	}

	if err := s.filesRepo.PermanentDelete(ctx, fileID, user.UserID); err != nil {
		return err
	}

	if logErr := s.activityRepo.Log(ctx, user.UserID, "DELETE_FILE_PERMANENT", "FILE", &fileID); logErr != nil {
		// Ignore log write error.
	}

	return nil
}

func (s *FileService) SetStarred(ctx context.Context, user domain.AuthUser, fileID string, starred bool) (domain.FileRecord, error) {
	if !IsUUID(fileID) {
		return domain.FileRecord{}, domain.NewValidationError("id berkas tidak valid")
	}

	record, err := s.filesRepo.SetStarred(ctx, fileID, user.UserID, starred)
	if err != nil {
		return domain.FileRecord{}, err
	}

	action := "STAR_FILE"
	if !starred {
		action = "UNSTAR_FILE"
	}
	if logErr := s.activityRepo.Log(ctx, user.UserID, action, "FILE", &fileID); logErr != nil {
		// Ignore log write error.
	}

	return record, nil
}

func (s *FileService) Search(
	ctx context.Context,
	user domain.AuthUser,
	query string,
	directoryID string,
	includeDeleted bool,
	limit int,
	offset int,
) ([]domain.FileRecord, int64, int, int, error) {
	query = strings.TrimSpace(query)
	directoryID = strings.TrimSpace(directoryID)

	if query == "" {
		return nil, 0, 0, 0, fmt.Errorf("%w: query wajib diisi", domain.ErrInvalidInput)
	}

	if len(query) < 2 {
		return nil, 0, 0, 0, fmt.Errorf("%w: query minimal 2 karakter", domain.ErrInvalidInput)
	}

	if len(query) > 255 {
		return nil, 0, 0, 0, fmt.Errorf("%w: query terlalu panjang", domain.ErrInvalidInput)
	}

	if directoryID != "" {
		if !IsUUID(directoryID) {
			return nil, 0, 0, 0, fmt.Errorf("%w: directory_id tidak valid", domain.ErrInvalidInput)
		}

		owned, err := s.directoryRepo.IsOwnedByUser(ctx, directoryID, user.UserID)
		if err != nil {
			return nil, 0, 0, 0, err
		}
		if !owned {
			return nil, 0, 0, 0, domain.ErrNotFound
		}
	}

	if limit == 0 {
		limit = defaultFileSearchLimit
	}
	if limit < 1 || limit > maxFileSearchLimit {
		return nil, 0, 0, 0, fmt.Errorf("%w: limit harus antara 1 dan %d", domain.ErrInvalidInput, maxFileSearchLimit)
	}

	if offset < 0 {
		return nil, 0, 0, 0, fmt.Errorf("%w: offset tidak boleh negatif", domain.ErrInvalidInput)
	}

	files, total, err := s.filesRepo.SearchByUser(ctx, user.UserID, domain.FileSearchFilter{
		DirectoryID:    directoryID,
		Query:          query,
		IncludeDeleted: includeDeleted,
		Limit:          limit,
		Offset:         offset,
	})
	if err != nil {
		return nil, 0, 0, 0, err
	}

	return files, total, limit, offset, nil
}

func (s *FileService) GetManifestInfo(ctx context.Context, manifestID string) (vaultclient.ManifestRecord, error) {
	return s.vault.GetManifest(ctx, manifestID)
}

func (s *FileService) Trash(ctx context.Context, user domain.AuthUser) ([]domain.FileRecord, error) {
	return s.filesRepo.ListTrash(ctx, user.UserID)
}

func (s *FileService) Starred(ctx context.Context, user domain.AuthUser) ([]domain.FileRecord, error) {
	return s.filesRepo.ListStarred(ctx, user.UserID)
}

func (s *FileService) openObjectFromChunks(ctx context.Context, manifestID string) (io.ReadCloser, int64, error) {
	if strings.TrimSpace(s.chunkRoot) == "" || s.chunkRoot == "." {
		return nil, 0, fmt.Errorf("VAULT_CHUNK_ROOT belum dikonfigurasi")
	}

	manifest, err := s.vault.GetManifest(ctx, manifestID)
	if err != nil {
		return nil, 0, err
	}

	tempFile, err := os.CreateTemp("", "pui-api-download-*.bin")
	if err != nil {
		return nil, 0, fmt.Errorf("buat temp object file: %w", err)
	}
	cleanup := func() {
		_ = tempFile.Close()
		_ = os.Remove(tempFile.Name())
	}

	fileHasher := blake3.New()
	multiWriter := io.MultiWriter(tempFile, fileHasher)
	var totalSize int64

	for _, chunkHash := range manifest.ChunkHashes {
		if err := ctx.Err(); err != nil {
			cleanup()
			return nil, 0, err
		}

		chunkPath, err := s.chunkPath(chunkHash)
		if err != nil {
			cleanup()
			return nil, 0, err
		}

		chunkFile, err := os.Open(chunkPath)
		if err != nil {
			cleanup()
			return nil, 0, fmt.Errorf("buka chunk %s: %w", chunkHash, err)
		}

		chunkHasher := blake3.New()
		written, copyErr := io.Copy(io.MultiWriter(multiWriter, chunkHasher), chunkFile)
		_ = chunkFile.Close()
		if copyErr != nil {
			cleanup()
			return nil, 0, fmt.Errorf("salin chunk %s: %w", chunkHash, copyErr)
		}

		computedChunkHash := hex.EncodeToString(chunkHasher.Sum(nil))
		if !strings.EqualFold(computedChunkHash, chunkHash) {
			cleanup()
			return nil, 0, fmt.Errorf("hash chunk %s tidak sesuai", chunkHash)
		}

		totalSize += written
	}

	if totalSize != manifest.TotalSizeBytes {
		cleanup()
		return nil, 0, fmt.Errorf("ukuran rekonstruksi objek tidak sesuai manifest")
	}

	computedFileHash := hex.EncodeToString(fileHasher.Sum(nil))
	if !strings.EqualFold(computedFileHash, manifest.FileHash) {
		cleanup()
		return nil, 0, fmt.Errorf("hash rekonstruksi objek tidak sesuai manifest")
	}

	if _, err := tempFile.Seek(0, io.SeekStart); err != nil {
		cleanup()
		return nil, 0, fmt.Errorf("rewind temp object file: %w", err)
	}

	return &deleteOnCloseFile{File: tempFile}, manifest.TotalSizeBytes, nil
}

func (s *FileService) chunkPath(chunkHash string) (string, error) {
	normalized := strings.ToLower(strings.TrimSpace(chunkHash))
	if len(normalized) != 64 {
		return "", fmt.Errorf("hash chunk tidak valid")
	}
	if _, err := hex.DecodeString(normalized); err != nil {
		return "", fmt.Errorf("hash chunk tidak valid")
	}

	return filepath.Join(s.chunkRoot, normalized[0:2], normalized[2:4], normalized+".bin"), nil
}

type deleteOnCloseFile struct {
	*os.File
}

func (f *deleteOnCloseFile) Close() error {
	name := f.Name()
	err := f.File.Close()
	removeErr := os.Remove(name)
	if err != nil {
		return err
	}
	return removeErr
}
