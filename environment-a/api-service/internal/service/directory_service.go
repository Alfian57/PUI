package service

import (
	"context"
	"strings"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"github.com/alfiang/pui/environment-a/api-service/internal/repository"
)

type DirectoryService struct {
	directoryRepo *repository.DirectoryRepository
	activityRepo  *repository.ActivityRepository
}

func NewDirectoryService(directoryRepo *repository.DirectoryRepository, activityRepo *repository.ActivityRepository) *DirectoryService {
	return &DirectoryService{directoryRepo: directoryRepo, activityRepo: activityRepo}
}

func (s *DirectoryService) Create(ctx context.Context, user domain.AuthUser, name, parentID string) (domain.DirectoryRecord, error) {
	name = strings.TrimSpace(name)
	parentID = strings.TrimSpace(parentID)
	if name == "" {
		return domain.DirectoryRecord{}, domain.NewValidationError("nama direktori wajib diisi")
	}

	if len(name) > 255 {
		return domain.DirectoryRecord{}, domain.NewValidationError("nama direktori terlalu panjang")
	}

	if parentID != "" && !IsUUID(parentID) {
		return domain.DirectoryRecord{}, domain.NewValidationError("parent_id tidak valid")
	}

	directory, err := s.directoryRepo.Create(ctx, user.UserID, name, parentID)
	if err != nil {
		return domain.DirectoryRecord{}, err
	}

	if logErr := s.activityRepo.Log(ctx, user.UserID, "CREATE_DIRECTORY", "DIRECTORY", &directory.ID); logErr != nil {
		// Keep core business success independent from audit log write.
	}

	return directory, nil
}

func (s *DirectoryService) Tree(ctx context.Context, user domain.AuthUser, rootID string) ([]domain.DirectoryRecord, error) {
	rootID = strings.TrimSpace(rootID)
	if rootID != "" && !IsUUID(rootID) {
		return nil, domain.NewValidationError("root_id tidak valid")
	}

	return s.directoryRepo.Tree(ctx, user.UserID, rootID)
}

func (s *DirectoryService) Breadcrumb(ctx context.Context, user domain.AuthUser, directoryID string) ([]domain.DirectoryRecord, error) {
	directoryID = strings.TrimSpace(directoryID)
	if !IsUUID(directoryID) {
		return nil, domain.NewValidationError("directory id tidak valid")
	}

	return s.directoryRepo.Breadcrumb(ctx, user.UserID, directoryID)
}

func (s *DirectoryService) IsOwnedByUser(ctx context.Context, user domain.AuthUser, directoryID string) (bool, error) {
	if !IsUUID(directoryID) {
		return false, domain.NewValidationError("directory id tidak valid")
	}

	return s.directoryRepo.IsOwnedByUser(ctx, directoryID, user.UserID)
}

func (s *DirectoryService) SoftDelete(ctx context.Context, user domain.AuthUser, directoryID string) (domain.DirectoryRecord, error) {
	directoryID = strings.TrimSpace(directoryID)
	if !IsUUID(directoryID) {
		return domain.DirectoryRecord{}, domain.NewValidationError("directory id tidak valid")
	}

	directory, err := s.directoryRepo.SoftDeleteSubtree(ctx, directoryID, user.UserID)
	if err != nil {
		return domain.DirectoryRecord{}, err
	}

	if logErr := s.activityRepo.Log(ctx, user.UserID, "DELETE_DIRECTORY_SOFT", "DIRECTORY", &directory.ID); logErr != nil {
		// Keep core business success independent from audit log write.
	}

	return directory, nil
}

func (s *DirectoryService) Restore(ctx context.Context, user domain.AuthUser, directoryID string) (domain.DirectoryRecord, error) {
	directoryID = strings.TrimSpace(directoryID)
	if !IsUUID(directoryID) {
		return domain.DirectoryRecord{}, domain.NewValidationError("directory id tidak valid")
	}

	directory, err := s.directoryRepo.RestoreSubtree(ctx, directoryID, user.UserID)
	if err != nil {
		return domain.DirectoryRecord{}, err
	}

	if logErr := s.activityRepo.Log(ctx, user.UserID, "RESTORE_DIRECTORY", "DIRECTORY", &directory.ID); logErr != nil {
		// Keep restore successful even if logging fails.
	}

	return directory, nil
}

func (s *DirectoryService) PermanentDelete(ctx context.Context, user domain.AuthUser, directoryID string) error {
	directoryID = strings.TrimSpace(directoryID)
	if !IsUUID(directoryID) {
		return domain.NewValidationError("directory id tidak valid")
	}

	if err := s.directoryRepo.PermanentDeleteSubtree(ctx, directoryID, user.UserID); err != nil {
		return err
	}

	if logErr := s.activityRepo.Log(ctx, user.UserID, "DELETE_DIRECTORY_PERMANENT", "DIRECTORY", &directoryID); logErr != nil {
		// Ignore log write error.
	}

	return nil
}

func (s *DirectoryService) SetStarred(ctx context.Context, user domain.AuthUser, directoryID string, starred bool) (domain.DirectoryRecord, error) {
	directoryID = strings.TrimSpace(directoryID)
	if !IsUUID(directoryID) {
		return domain.DirectoryRecord{}, domain.NewValidationError("directory id tidak valid")
	}

	directory, err := s.directoryRepo.SetStarred(ctx, directoryID, user.UserID, starred)
	if err != nil {
		return domain.DirectoryRecord{}, err
	}

	action := "STAR_DIRECTORY"
	if !starred {
		action = "UNSTAR_DIRECTORY"
	}
	if logErr := s.activityRepo.Log(ctx, user.UserID, action, "DIRECTORY", &directory.ID); logErr != nil {
		// Ignore log write error.
	}

	return directory, nil
}

func (s *DirectoryService) Trash(ctx context.Context, user domain.AuthUser) ([]domain.DirectoryRecord, error) {
	return s.directoryRepo.ListTrashRoots(ctx, user.UserID)
}

func (s *DirectoryService) Starred(ctx context.Context, user domain.AuthUser) ([]domain.DirectoryRecord, error) {
	return s.directoryRepo.ListStarred(ctx, user.UserID)
}
