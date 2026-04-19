package domain

import "time"

type ActivityLogRecord struct {
	ID           string    `json:"id"`
	UserID       string    `json:"user_id"`
	Action       string    `json:"action"`
	ResourceType string    `json:"resource_type"`
	ResourceID   *string   `json:"resource_id,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

type ActivityLogFilter struct {
	Action       string
	ResourceType string
	Limit        int
	Offset       int
}
