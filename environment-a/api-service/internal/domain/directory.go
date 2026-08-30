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

type DirectoryDetailScope string

const (
	DirectoryDetailScopeStarred DirectoryDetailScope = "starred"
	DirectoryDetailScopeTrash   DirectoryDetailScope = "trash"
)

type DirectoryDetailSummary struct {
	DirectoryCount int64 `json:"directory_count"`
	FileCount      int64 `json:"file_count"`
	TotalBytes     int64 `json:"total_bytes"`
}

type DirectoryDetail struct {
	Directory   DirectoryRecord        `json:"directory"`
	Summary     DirectoryDetailSummary `json:"summary"`
	Directories []DirectoryRecord      `json:"directories"`
}
