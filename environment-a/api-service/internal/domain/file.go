package domain

import "time"

type FileRecord struct {
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

type FileSearchFilter struct {
	DirectoryID    string
	Query          string
	IncludeDeleted bool
	Limit          int
	Offset         int
}

type FileListFilter struct {
	DirectoryID    string
	IncludeDeleted bool
	Sort           string
	CreatedFrom    *time.Time
	CreatedTo      *time.Time
	Limit          int
	Offset         int
}

type FileListStats struct {
	TotalBytes   int64
	TotalChunks  int
	ReusedChunks int
}
