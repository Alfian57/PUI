package dto

import "time"

type CreateDirectoryRequest struct {
	Name     string `json:"name" validate:"required,max=255"`
	ParentID string `json:"parent_id"`
}

type DirectoryDTO struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Depth     int       `json:"depth"`
	ParentID  *string   `json:"parent_id,omitempty"`
	CreatedAt time.Time `json:"created_at"`
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
