package dto

import "time"

type FileDTO struct {
	ID          string     `json:"id"`
	DirectoryID string     `json:"directory_id"`
	Name        string     `json:"name"`
	SizeBytes   int64      `json:"size_bytes"`
	MIMEType    string     `json:"mime_type"`
	ManifestID  string     `json:"manifest_id"`
	CreatedAt   time.Time  `json:"created_at"`
	DeletedAt   *time.Time `json:"deleted_at,omitempty"`
}

type UploadCommitResultDTO struct {
	ManifestID      string  `json:"manifest_id"`
	FileHash        string  `json:"file_hash"`
	TotalSizeBytes  int64   `json:"total_size_bytes"`
	ChunkCount      int     `json:"chunk_count"`
	DedupRatio      float64 `json:"dedup_ratio"`
	Immutable       bool    `json:"immutable"`
	NewChunkCount   int     `json:"new_chunk_count"`
	ReuseChunkCount int     `json:"reuse_chunk_count"`
}

type FileListResponse struct {
	Status      string    `json:"status"`
	DirectoryID string    `json:"directory_id"`
	Files       []FileDTO `json:"files"`
}

type FileDetailResponse struct {
	Status string  `json:"status"`
	File   FileDTO `json:"file"`
}

type UploadResponse struct {
	Status             string                `json:"status"`
	File               FileDTO               `json:"file"`
	UploadCommitResult UploadCommitResultDTO `json:"upload_commit_result"`
}

type SoftDeleteResponse struct {
	Status    string    `json:"status"`
	FileID    string    `json:"file_id"`
	DeletedAt time.Time `json:"deleted_at"`
}
