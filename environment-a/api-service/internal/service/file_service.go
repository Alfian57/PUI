package service

import (
	"context"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"github.com/alfiang/pui/environment-a/api-service/internal/repository"
	"github.com/alfiang/pui/environment-a/api-service/internal/vaultclient"
)

type VaultFileClient interface {
	Upload(ctx context.Context, fileName string, reader io.Reader) (vaultclient.UploadCommitResult, error)
	DownloadObject(ctx context.Context, manifestID string) (io.ReadCloser, int64, error)
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
	filesRepo     *repository.FileRepository
	directoryRepo *repository.DirectoryRepository
	activityRepo  *repository.ActivityRepository
	vault         VaultFileClient
}

func NewFileService(filesRepo *repository.FileRepository, directoryRepo *repository.DirectoryRepository, activityRepo *repository.ActivityRepository, vault VaultFileClient) *FileService {
	return &FileService{
		filesRepo:     filesRepo,
		directoryRepo: directoryRepo,
		activityRepo:  activityRepo,
		vault:         vault,
	}
}

func (s *FileService) ListByDirectory(ctx context.Context, user domain.AuthUser, directoryID string, includeDeleted bool) ([]domain.FileRecord, error) {
	if !IsUUID(directoryID) {
		return nil, fmt.Errorf("directory id tidak valid")
	}

	return s.filesRepo.ListByDirectory(ctx, user.UserID, directoryID, includeDeleted)
}

func (s *FileService) Upload(ctx context.Context, user domain.AuthUser, directoryID, fileName, mimeType string, reader io.Reader) (UploadOutcome, error) {
	if !IsUUID(directoryID) {
		return UploadOutcome{}, fmt.Errorf("directory_id tidak valid")
	}

	owned, err := s.directoryRepo.IsOwnedByUser(ctx, directoryID, user.UserID)
	if err != nil {
		return UploadOutcome{}, err
	}
	if !owned {
		return UploadOutcome{}, domain.ErrNotFound
	}

	fileName = strings.TrimSpace(fileName)
	if fileName == "" {
		fileName = "upload.bin"
	}

	mimeType = strings.TrimSpace(mimeType)
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	uploadResult, err := s.vault.Upload(ctx, fileName, reader)
	if err != nil {
		if logErr := s.activityRepo.Log(ctx, user.UserID, "UPLOAD_FAILED", "DIRECTORY", &directoryID); logErr != nil {
			// Ignore logging errors to keep root cause intact.
		}
		return UploadOutcome{}, err
	}

	record, err := s.filesRepo.Create(ctx, directoryID, fileName, uploadResult.TotalSizeBytes, mimeType, uploadResult.ManifestID)
	if err != nil {
		return UploadOutcome{}, fmt.Errorf("simpan metadata file gagal: %w", err)
	}

	if logErr := s.activityRepo.Log(ctx, user.UserID, "UPLOAD", "FILE", &record.ID); logErr != nil {
		// Keep upload response successful even when audit log fails.
	}

	return UploadOutcome{File: record, UploadCommitResult: uploadResult}, nil
}

func (s *FileService) Detail(ctx context.Context, user domain.AuthUser, fileID string, includeDeleted bool) (domain.FileRecord, error) {
	if !IsUUID(fileID) {
		return domain.FileRecord{}, fmt.Errorf("file id tidak valid")
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
		return DownloadOutcome{}, fmt.Errorf("ukuran objek vault tidak sesuai metadata file")
	}

	if logErr := s.activityRepo.Log(ctx, user.UserID, "DOWNLOAD", "FILE", &record.ID); logErr != nil {
		// Do not fail successful download stream due to audit error.
	}

	return DownloadOutcome{File: record, Body: body, ContentLength: contentLength}, nil
}

func (s *FileService) SoftDelete(ctx context.Context, user domain.AuthUser, fileID string) (time.Time, error) {
	if !IsUUID(fileID) {
		return time.Time{}, fmt.Errorf("file id tidak valid")
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
