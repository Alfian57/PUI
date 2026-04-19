package service

import (
	"context"
	"fmt"
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
		return domain.DirectoryRecord{}, fmt.Errorf("nama direktori wajib diisi")
	}

	if len(name) > 255 {
		return domain.DirectoryRecord{}, fmt.Errorf("nama direktori terlalu panjang")
	}

	if parentID != "" && !IsUUID(parentID) {
		return domain.DirectoryRecord{}, fmt.Errorf("parent_id tidak valid")
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
		return nil, fmt.Errorf("root_id tidak valid")
	}

	return s.directoryRepo.Tree(ctx, user.UserID, rootID)
}

func (s *DirectoryService) Breadcrumb(ctx context.Context, user domain.AuthUser, directoryID string) ([]domain.DirectoryRecord, error) {
	directoryID = strings.TrimSpace(directoryID)
	if !IsUUID(directoryID) {
		return nil, fmt.Errorf("directory id tidak valid")
	}

	return s.directoryRepo.Breadcrumb(ctx, user.UserID, directoryID)
}

func (s *DirectoryService) IsOwnedByUser(ctx context.Context, user domain.AuthUser, directoryID string) (bool, error) {
	if !IsUUID(directoryID) {
		return false, fmt.Errorf("directory id tidak valid")
	}

	return s.directoryRepo.IsOwnedByUser(ctx, directoryID, user.UserID)
}
