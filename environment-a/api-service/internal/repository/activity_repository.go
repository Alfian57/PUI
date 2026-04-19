package repository

import (
	"context"
	"fmt"

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
