package domain

import "time"

type FileRecord struct {
	ID          string     `json:"id"`
	DirectoryID string     `json:"directory_id"`
	Name        string     `json:"name"`
	SizeBytes   int64      `json:"size_bytes"`
	MIMEType    string     `json:"mime_type"`
	ManifestID  string     `json:"manifest_id"`
	CreatedAt   time.Time  `json:"created_at"`
	DeletedAt   *time.Time `json:"deleted_at,omitempty"`
}
