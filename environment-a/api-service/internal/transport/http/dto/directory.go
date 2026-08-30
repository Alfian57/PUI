package dto

import "time"

type CreateDirectoryRequest struct {
	Name     string `json:"name" validate:"required,max=255"`
	ParentID string `json:"parent_id"`
}

type DirectoryDTO struct {
	ID        string     `json:"id"`
	Name      string     `json:"name"`
	Depth     int        `json:"depth"`
	ParentID  *string    `json:"parent_id,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
	DeletedAt *time.Time `json:"deleted_at,omitempty"`
	StarredAt *time.Time `json:"starred_at,omitempty"`
}

type DirectoryResponse struct {
	Status    string       `json:"status"`
	Directory DirectoryDTO `json:"directory"`
}

type DirectoryTreeResponse struct {
	Status      string         `json:"status"`
	RootID      string         `json:"root_id,omitempty"`
	Directories []DirectoryDTO `json:"directories"`
}

type BreadcrumbResponse struct {
	Status      string         `json:"status"`
	DirectoryID string         `json:"directory_id"`
	Breadcrumb  []DirectoryDTO `json:"breadcrumb"`
}

type DirectoryDetailSummaryDTO struct {
	DirectoryCount int64 `json:"directory_count"`
	FileCount      int64 `json:"file_count"`
	TotalBytes     int64 `json:"total_bytes"`
}

type DirectoryDetailResponse struct {
	Status      string                    `json:"status"`
	Directory   DirectoryDTO              `json:"directory"`
	Summary     DirectoryDetailSummaryDTO `json:"summary"`
	Directories []DirectoryDTO            `json:"directories"`
	Files       []FileDTO                 `json:"files"`
}

type DirectoryMutationResponse struct {
	Status    string       `json:"status"`
	Directory DirectoryDTO `json:"directory"`
}

type TrashResponse struct {
	Status         string         `json:"status"`
	Total          int64          `json:"total"`
	DirectoryTotal int64          `json:"directory_total"`
	FileTotal      int64          `json:"file_total"`
	Limit          int            `json:"limit"`
	Offset         int            `json:"offset"`
	Directories    []DirectoryDTO `json:"directories"`
	Files          []FileDTO      `json:"files"`
}

type StarredResponse struct {
	Status         string         `json:"status"`
	Total          int64          `json:"total"`
	DirectoryTotal int64          `json:"directory_total"`
	FileTotal      int64          `json:"file_total"`
	Limit          int            `json:"limit"`
	Offset         int            `json:"offset"`
	Directories    []DirectoryDTO `json:"directories"`
	Files          []FileDTO      `json:"files"`
}
