package dto

import "time"

type ActivityLogDTO struct {
	ID           string    `json:"id"`
	UserID       string    `json:"user_id"`
	Action       string    `json:"action"`
	ResourceType string    `json:"resource_type"`
	ResourceID   *string   `json:"resource_id,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

type ActivityLogListResponse struct {
	Status       string           `json:"status"`
	Total        int64            `json:"total"`
	Limit        int              `json:"limit"`
	Offset       int              `json:"offset"`
	ActivityLogs []ActivityLogDTO `json:"activity_logs"`
}
