package service

import (
	"context"
	"fmt"
	"io"
	"log"
	"strings"
	"time"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"github.com/alfiang/pui/environment-a/api-service/internal/vaultclient"
)

const (
	defaultFileSearchLimit = 20
	maxFileSearchLimit     = 200
)

type VaultFileClient interface {
	Upload(ctx context.Context, fileName string, reader io.Reader) (vaultclient.UploadCommitResult, error)
	GetManifest(ctx context.Context, manifestID string) (vaultclient.ManifestRecord, error)
	DownloadObject(ctx context.Context, manifestID string) (io.ReadCloser, int64, error)
}

type fileMetadataRepository interface {
	ListByDirectory(ctx context.Context, userID, directoryID string, includeDeleted bool) ([]domain.FileRecord, error)
	ListByDirectoryPage(ctx context.Context, userID string, filter domain.FileListFilter) ([]domain.FileRecord, int64, domain.FileListStats, error)
	CreatePending(ctx context.Context, userID, directoryID, name, mimeType string) (domain.FileRecord, error)
	MarkCommitted(ctx context.Context, fileID, userID string, result vaultclient.UploadCommitResult) (domain.FileRecord, error)
	RequeueManifestRetirement(ctx context.Context, manifestID string) error
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
	ListTrashPage(ctx context.Context, userID string, limit, offset int) ([]domain.FileRecord, int64, error)
	ListStarredPage(ctx context.Context, userID string, limit, offset int) ([]domain.FileRecord, int64, error)
	ExpireStalePending(ctx context.Context, olderThan time.Time) (int64, error)
}

type directoryOwnershipRepository interface {
	IsOwnedByUser(ctx context.Context, directoryID, userID string) (bool, error)
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
}

func NewFileService(filesRepo fileMetadataRepository, directoryRepo directoryOwnershipRepository, activityRepo activityLogger, vault VaultFileClient) *FileService {
	return &FileService{
		filesRepo:     filesRepo,
		directoryRepo: directoryRepo,
		activityRepo:  activityRepo,
		vault:         vault,
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

func (s *FileService) ListByDirectoryPage(ctx context.Context, user domain.AuthUser, filter domain.FileListFilter) ([]domain.FileRecord, int64, domain.FileListStats, int, int, error) {
	filter.DirectoryID = strings.TrimSpace(filter.DirectoryID)
	filter.Sort = strings.TrimSpace(filter.Sort)
	if filter.Sort == "" {
		filter.Sort = "newest"
	}
	if filter.Sort != "newest" && filter.Sort != "oldest" && filter.Sort != "name-asc" && filter.Sort != "name-desc" && filter.Sort != "type" && filter.Sort != "starred" {
		return nil, 0, domain.FileListStats{}, 0, 0, fmt.Errorf("%w: sort tidak valid", domain.ErrInvalidInput)
	}

	normalizedLimit, normalizedOffset, err := normalizePagination(filter.Limit, filter.Offset)
	if err != nil {
		return nil, 0, domain.FileListStats{}, 0, 0, err
	}
	filter.Limit = normalizedLimit
	filter.Offset = normalizedOffset
	if filter.CreatedFrom != nil && filter.CreatedTo != nil && filter.CreatedFrom.After(*filter.CreatedTo) {
		return nil, 0, domain.FileListStats{}, 0, 0, fmt.Errorf("%w: rentang tanggal tidak valid", domain.ErrInvalidInput)
	}

	if filter.DirectoryID != "" {
		if !IsUUID(filter.DirectoryID) {
			return nil, 0, domain.FileListStats{}, 0, 0, fmt.Errorf("%w: directory_id tidak valid", domain.ErrInvalidInput)
		}

		owned, err := s.directoryRepo.IsOwnedByUser(ctx, filter.DirectoryID, user.UserID)
		if err != nil {
			return nil, 0, domain.FileListStats{}, 0, 0, err
		}
		if !owned {
			return nil, 0, domain.FileListStats{}, 0, 0, domain.ErrNotFound
		}
	}

	files, total, stats, err := s.filesRepo.ListByDirectoryPage(ctx, user.UserID, filter)
	if err != nil {
		return nil, 0, domain.FileListStats{}, 0, 0, err
	}

	return files, total, stats, filter.Limit, filter.Offset, nil
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
		if markErr := s.filesRepo.MarkFailed(ctx, pendingRecord.ID, user.UserID); markErr != nil {
			log.Printf("event=mark_failed_error file_id=%s user_id=%s err=%v", pendingRecord.ID, user.UserID, markErr)
		}
		if logErr := s.activityRepo.Log(ctx, user.UserID, "UPLOAD_FAILED", "DIRECTORY", activityResourceID); logErr != nil {
			log.Printf("event=activity_log_error action=UPLOAD_FAILED user_id=%s err=%v", user.UserID, logErr)
		}
		return UploadOutcome{}, err
	}

	record, err := s.filesRepo.MarkCommitted(ctx, pendingRecord.ID, user.UserID, uploadResult)
	if err != nil {
		if markErr := s.filesRepo.MarkFailed(ctx, pendingRecord.ID, user.UserID); markErr != nil {
			log.Printf("event=mark_failed_error file_id=%s user_id=%s err=%v", pendingRecord.ID, user.UserID, markErr)
		}
		return UploadOutcome{}, fmt.Errorf("simpan metadata berkas gagal: %w", err)
	}

	if err := s.filesRepo.RequeueManifestRetirement(ctx, record.ManifestID); err != nil {
		log.Printf("event=requeue_manifest_retirement_failed manifest_id=%s err=%v", record.ManifestID, err)
	}
	if retainer, ok := s.vault.(interface {
		RetainManifest(context.Context, string) error
	}); ok {
		if err := retainer.RetainManifest(ctx, record.ManifestID); err != nil {
			log.Printf("event=retain_manifest_failed manifest_id=%s err=%v", record.ManifestID, err)
		}
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

	body, contentLength, err := s.vault.DownloadObject(ctx, record.ManifestID)
	if err != nil {
		return DownloadOutcome{}, err
	}

	if contentLength >= 0 && contentLength != record.SizeBytes {
		_ = body.Close()
		return DownloadOutcome{}, fmt.Errorf("ukuran objek vault tidak sesuai metadata berkas")
	}

	// Audit: distinguish trashed downloads explicitly.
	action := "DOWNLOAD"
	if record.DeletedAt != nil {
		action = "DOWNLOAD_TRASHED"
	}
	if logErr := s.activityRepo.Log(ctx, user.UserID, action, "FILE", &record.ID); logErr != nil {
		log.Printf("event=activity_log_error action=%s file_id=%s user_id=%s err=%v", action, record.ID, user.UserID, logErr)
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

func (s *FileService) TrashPage(ctx context.Context, user domain.AuthUser, limit, offset int) ([]domain.FileRecord, int64, int, int, error) {
	limit, offset, err := normalizePagination(limit, offset)
	if err != nil {
		return nil, 0, 0, 0, err
	}

	files, total, err := s.filesRepo.ListTrashPage(ctx, user.UserID, limit, offset)
	if err != nil {
		return nil, 0, 0, 0, err
	}

	return files, total, limit, offset, nil
}

func (s *FileService) StarredPage(ctx context.Context, user domain.AuthUser, limit, offset int) ([]domain.FileRecord, int64, int, int, error) {
	limit, offset, err := normalizePagination(limit, offset)
	if err != nil {
		return nil, 0, 0, 0, err
	}

	files, total, err := s.filesRepo.ListStarredPage(ctx, user.UserID, limit, offset)
	if err != nil {
		return nil, 0, 0, 0, err
	}

	return files, total, limit, offset, nil
}
