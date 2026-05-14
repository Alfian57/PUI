package dto

type UserInsightResponse struct {
	Status       string                 `json:"status"`
	Range        string                 `json:"range"`
	GeneratedAt  string                 `json:"generated_at"`
	Summary      UserInsightSummaryDTO  `json:"summary"`
	Activity     []UserActivityPointDTO `json:"activity"`
	FileTypes    []UserFileTypeStatDTO  `json:"file_types"`
	LargestFiles []InsightFileItemDTO   `json:"largest_files"`
	TrashItems   []InsightTrashItemDTO  `json:"trash_items"`
}

type UserInsightSummaryDTO struct {
	ActiveFiles        int64   `json:"active_files"`
	ActiveFolders      int64   `json:"active_folders"`
	TrashFiles         int64   `json:"trash_files"`
	TrashFolders       int64   `json:"trash_folders"`
	StarredFiles       int64   `json:"starred_files"`
	StarredFolders     int64   `json:"starred_folders"`
	ActiveStorageBytes int64   `json:"active_storage_bytes"`
	TrashStorageBytes  int64   `json:"trash_storage_bytes"`
	TotalChunks        int64   `json:"total_chunks"`
	NewChunks          int64   `json:"new_chunks"`
	ReuseChunks        int64   `json:"reuse_chunks"`
	DedupRatio         float64 `json:"dedup_ratio"`
	UploadsInRange     int64   `json:"uploads_in_range"`
	DownloadsInRange   int64   `json:"downloads_in_range"`
}

type UserActivityPointDTO struct {
	Date      string `json:"date"`
	Uploads   int64  `json:"uploads"`
	Downloads int64  `json:"downloads"`
	Deletes   int64  `json:"deletes"`
	Restores  int64  `json:"restores"`
	Stars     int64  `json:"stars"`
}

type UserFileTypeStatDTO struct {
	Type       string `json:"type"`
	Count      int64  `json:"count"`
	TotalBytes int64  `json:"total_bytes"`
}

type InsightFileItemDTO struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	SizeBytes int64  `json:"size_bytes"`
	MIMEType  string `json:"mime_type"`
	CreatedAt string `json:"created_at"`
}

type InsightTrashItemDTO struct {
	ID        string `json:"id"`
	Kind      string `json:"kind"`
	Name      string `json:"name"`
	SizeBytes int64  `json:"size_bytes"`
	DeletedAt string `json:"deleted_at"`
}
