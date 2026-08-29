package dto

import "time"

type FileDTO struct {
	ID            string     `json:"id"`
	DirectoryID   *string    `json:"directory_id,omitempty"`
	Name          string     `json:"name"`
	SizeBytes     int64      `json:"size_bytes"`
	MIMEType      string     `json:"mime_type"`
	ManifestID    string     `json:"manifest_id"`
	StorageStatus string     `json:"status_penyimpanan"`
	ChunkCount    int        `json:"chunk_count"`
	NewChunks     int        `json:"new_chunk_count"`
	ReuseChunks   int        `json:"reuse_chunk_count"`
	DedupRatio    float64    `json:"dedup_ratio"`
	CreatedAt     time.Time  `json:"created_at"`
	DeletedAt     *time.Time `json:"deleted_at,omitempty"`
	StarredAt     *time.Time `json:"starred_at,omitempty"`
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
	Status       string    `json:"status"`
	DirectoryID  string    `json:"directory_id,omitempty"`
	Total        int64     `json:"total"`
	Limit        int       `json:"limit"`
	Offset       int       `json:"offset"`
	TotalBytes   int64     `json:"total_bytes"`
	TotalChunks  int       `json:"total_chunks"`
	ReusedChunks int       `json:"reused_chunks"`
	Files        []FileDTO `json:"files"`
}

type FileSearchResponse struct {
	Status         string    `json:"status"`
	Query          string    `json:"query"`
	DirectoryID    string    `json:"directory_id,omitempty"`
	IncludeDeleted bool      `json:"include_deleted"`
	Total          int64     `json:"total"`
	Limit          int       `json:"limit"`
	Offset         int       `json:"offset"`
	Files          []FileDTO `json:"files"`
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

type FileMutationResponse struct {
	Status string  `json:"status"`
	File   FileDTO `json:"file"`
}

type ManifestInfoDTO struct {
	ManifestID     string    `json:"manifest_id"`
	FileHash       string    `json:"file_hash"`
	TotalSizeBytes int64     `json:"total_size_bytes"`
	ChunkCount     int       `json:"chunk_count"`
	Immutable      bool      `json:"immutable"`
	CreatedAt      time.Time `json:"created_at"`
}

type FileManifestResponse struct {
	Status   string          `json:"status"`
	File     FileDTO         `json:"file"`
	Manifest ManifestInfoDTO `json:"manifest"`
}
