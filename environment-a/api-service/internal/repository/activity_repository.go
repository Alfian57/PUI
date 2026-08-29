package repository

import (
	"context"
	"fmt"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"gorm.io/gorm"
)

type ActivityRepository struct {
	db *gorm.DB
}

func NewActivityRepository(db *gorm.DB) *ActivityRepository {
	return &ActivityRepository{db: db}
}

func (r *ActivityRepository) Log(ctx context.Context, userID, action, resourceType string, resourceID *string) error {
	var value any
	if resourceID != nil && *resourceID != "" {
		value = *resourceID
	}

	result := r.db.WithContext(ctx).Exec(
		`INSERT INTO activity_logs (user_id, action, resource_type, resource_id) VALUES (?, ?, ?, ?)`,
		userID,
		action,
		resourceType,
		value,
	)
	if result.Error != nil {
		return fmt.Errorf("insert activity log: %w", result.Error)
	}

	return nil
}

func (r *ActivityRepository) ListByUser(ctx context.Context, userID string, filter domain.ActivityLogFilter) ([]domain.ActivityLogRecord, int64, error) {
	where := ` WHERE user_id = ?::uuid`
	args := []any{userID}

	if filter.Action != "" {
		where += ` AND action = ?`
		args = append(args, filter.Action)
	}

	if filter.ResourceType != "" {
		where += ` AND resource_type = ?`
		args = append(args, filter.ResourceType)
	}

	var total int64
	countQuery := `SELECT COUNT(*) FROM activity_logs` + where
	if err := r.db.WithContext(ctx).Raw(countQuery, args...).Scan(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count activity logs: %w", err)
	}

	listQuery := `SELECT id::text, user_id::text, action, resource_type, resource_id::text, created_at
		FROM activity_logs` + where + ` ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`
	listArgs := append(append([]any{}, args...), filter.Limit, filter.Offset)

	records := make([]domain.ActivityLogRecord, 0, filter.Limit)
	if err := r.db.WithContext(ctx).Raw(listQuery, listArgs...).Scan(&records).Error; err != nil {
		return nil, 0, fmt.Errorf("query activity logs: %w", err)
	}

	return records, total, nil
}
