package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"github.com/alfiang/pui/environment-a/api-service/internal/repository"
)

const (
	defaultActivityLogsLimit = 20
	maxActivityLogsLimit     = 200
)

type ActivityService struct {
	activityRepo *repository.ActivityRepository
}

func NewActivityService(activityRepo *repository.ActivityRepository) *ActivityService {
	return &ActivityService{activityRepo: activityRepo}
}

func (s *ActivityService) List(
	ctx context.Context,
	user domain.AuthUser,
	action string,
	resourceType string,
	limit int,
	offset int,
) ([]domain.ActivityLogRecord, int64, int, int, error) {
	action = strings.ToUpper(strings.TrimSpace(action))
	resourceType = strings.ToUpper(strings.TrimSpace(resourceType))

	if len(action) > 100 {
		return nil, 0, 0, 0, fmt.Errorf("%w: action terlalu panjang", domain.ErrInvalidInput)
	}

	if len(resourceType) > 50 {
		return nil, 0, 0, 0, fmt.Errorf("%w: resource_type terlalu panjang", domain.ErrInvalidInput)
	}

	if limit == 0 {
		limit = defaultActivityLogsLimit
	}
	if limit < 1 || limit > maxActivityLogsLimit {
		return nil, 0, 0, 0, fmt.Errorf("%w: limit harus antara 1 dan %d", domain.ErrInvalidInput, maxActivityLogsLimit)
	}

	if offset < 0 {
		return nil, 0, 0, 0, fmt.Errorf("%w: offset tidak boleh negatif", domain.ErrInvalidInput)
	}

	records, total, err := s.activityRepo.ListByUser(ctx, user.UserID, domain.ActivityLogFilter{
		Action:       action,
		ResourceType: resourceType,
		Limit:        limit,
		Offset:       offset,
	})
	if err != nil {
		return nil, 0, 0, 0, err
	}

	return records, total, limit, offset, nil
}
