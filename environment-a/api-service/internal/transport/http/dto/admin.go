package dto

type AdminAnalyticsResponse struct {
	Status      string                   `json:"status"`
	Range       string                   `json:"range"`
	GeneratedAt string                   `json:"generated_at"`
	Summary     AdminAnalyticsSummaryDTO `json:"summary"`
	Activity    []AdminActivityPointDTO  `json:"activity"`
	FileTypes   []AdminFileTypeStatDTO   `json:"file_types"`
	SizeBuckets []AdminSizeBucketStatDTO `json:"size_buckets"`
	Depths      []AdminDepthStatDTO      `json:"depths"`
}

type AdminAnalyticsSummaryDTO struct {
	TotalUsers            int64   `json:"total_users"`
	TotalAdmins           int64   `json:"total_admins"`
	ActiveUsers           int64   `json:"active_users"`
	ActiveFiles           int64   `json:"active_files"`
	ActiveFolders         int64   `json:"active_folders"`
	TrashFiles            int64   `json:"trash_files"`
	TrashFolders          int64   `json:"trash_folders"`
	StarredFiles          int64   `json:"starred_files"`
	StarredFolders        int64   `json:"starred_folders"`
	ActiveStorageBytes    int64   `json:"active_storage_bytes"`
	TrashStorageBytes     int64   `json:"trash_storage_bytes"`
	TotalChunks           int64   `json:"total_chunks"`
	NewChunks             int64   `json:"new_chunks"`
	ReuseChunks           int64   `json:"reuse_chunks"`
	DedupRatio            float64 `json:"dedup_ratio"`
	UploadsInRange        int64   `json:"uploads_in_range"`
	DownloadsInRange      int64   `json:"downloads_in_range"`
	DeletedItemsInRange   int64   `json:"deleted_items_in_range"`
	RestoredItemsInRange  int64   `json:"restored_items_in_range"`
	StarredActionsInRange int64   `json:"starred_actions_in_range"`
}

type AdminActivityPointDTO struct {
	Date      string `json:"date"`
	Logins    int64  `json:"logins"`
	Uploads   int64  `json:"uploads"`
	Downloads int64  `json:"downloads"`
	Deletes   int64  `json:"deletes"`
	Restores  int64  `json:"restores"`
	Stars     int64  `json:"stars"`
}

type AdminFileTypeStatDTO struct {
	Type       string `json:"type"`
	Count      int64  `json:"count"`
	TotalBytes int64  `json:"total_bytes"`
}

type AdminSizeBucketStatDTO struct {
	Bucket string `json:"bucket"`
	Count  int64  `json:"count"`
}

type AdminDepthStatDTO struct {
	Depth int   `json:"depth"`
	Count int64 `json:"count"`
}
