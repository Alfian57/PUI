package uds

import "time"

const (
	ErrorCodeOperationForbidden = "operation_forbidden"
)

type ErrorContract struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Method  string `json:"method,omitempty"`
	Path    string `json:"path,omitempty"`
}

type ManifestRecord struct {
	ManifestID     string    `json:"manifest_id"`
	FileHash       string    `json:"file_hash"`
	ChunkHashes    []string  `json:"chunk_hashes"`
	TotalSizeBytes int64     `json:"total_size_bytes"`
	ChunkCount     int       `json:"chunk_count"`
	CreatedAt      time.Time `json:"created_at"`
	Immutable      bool      `json:"immutable"`
}

type ChunkRecord struct {
	ChunkHash        string    `json:"chunk_hash"`
	SizeBytes        int64     `json:"size_bytes"`
	StoragePath      string    `json:"storage_path"`
	ManifestRefCount int       `json:"manifest_ref_count"`
	Retained         bool      `json:"retained"`
	CreatedAt        time.Time `json:"created_at"`
}

type UploadCommitResult struct {
	ManifestID      string  `json:"manifest_id"`
	FileHash        string  `json:"file_hash"`
	TotalSizeBytes  int64   `json:"total_size_bytes"`
	ChunkCount      int     `json:"chunk_count"`
	DedupRatio      float64 `json:"dedup_ratio"`
	Immutable       bool    `json:"immutable"`
	NewChunkCount   int     `json:"new_chunk_count"`
	ReuseChunkCount int     `json:"reuse_chunk_count"`
}

type UploadResponse struct {
	Status             string             `json:"status"`
	UploadCommitResult UploadCommitResult `json:"upload_commit_result"`
}

type ManifestResponse struct {
	Status         string         `json:"status"`
	ManifestRecord ManifestRecord `json:"manifest_record"`
}

type ChunkStatusResponse struct {
	Status      string      `json:"status"`
	ChunkHash   string      `json:"chunk_hash"`
	Exists      bool        `json:"exists"`
	ChunkRecord ChunkRecord `json:"chunk_record"`
}
