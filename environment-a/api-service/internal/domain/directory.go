package domain

import "time"

type DirectoryRecord struct {
	ID        string     `json:"id"`
	Name      string     `json:"name"`
	Depth     int        `json:"depth"`
	ParentID  *string    `json:"parent_id,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
	DeletedAt *time.Time `json:"deleted_at,omitempty"`
	StarredAt *time.Time `json:"starred_at,omitempty"`
}
