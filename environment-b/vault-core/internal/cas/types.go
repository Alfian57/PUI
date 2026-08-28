package cas

import (
	"errors"
	"time"
)

var (
	ErrNotFound      = errors.New("not found")
	ErrInvalidHash   = errors.New("invalid hash")
	ErrInvalidUpload = errors.New("invalid upload")
)

type ManifestRecord struct {
	ManifestID     string     `json:"manifest_id"`
	FileHash       string     `json:"file_hash"`
	ChunkHashes    []string   `json:"chunk_hashes"`
	TotalSizeBytes int64      `json:"total_size_bytes"`
	ChunkCount     int        `json:"chunk_count"`
	CreatedAt      time.Time  `json:"created_at"`
	Immutable      bool       `json:"immutable"`
	Retired        bool       `json:"retired,omitempty"`
	RetiredAt      *time.Time `json:"retired_at,omitempty"`
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

type UploadSessionRecord struct {
	SessionID      string    `json:"session_id"`
	FileName       string    `json:"file_name"`
	ReceivedChunks []string  `json:"received_chunks"`
	StartedAt      time.Time `json:"started_at"`
	ExpiresAt      time.Time `json:"expires_at"`
	State          string    `json:"state"`
}
