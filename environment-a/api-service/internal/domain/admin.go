package domain

import "time"

type AdminAnalytics struct {
	Range       string
	GeneratedAt time.Time
	Summary     AdminAnalyticsSummary
	Activity    []AdminActivityPoint
	FileTypes   []AdminFileTypeStat
	SizeBuckets []AdminSizeBucketStat
	Depths      []AdminDepthStat
}

type AdminAnalyticsSummary struct {
	TotalUsers            int64
	TotalAdmins           int64
	ActiveUsers           int64
	ActiveFiles           int64
	ActiveFolders         int64
	TrashFiles            int64
	TrashFolders          int64
	StarredFiles          int64
	StarredFolders        int64
	ActiveStorageBytes    int64
	TrashStorageBytes     int64
	TotalChunks           int64
	NewChunks             int64
	ReuseChunks           int64
	DedupRatio            float64
	UploadsInRange        int64
	DownloadsInRange      int64
	DeletedItemsInRange   int64
	RestoredItemsInRange  int64
	StarredActionsInRange int64
}

type AdminActivityPoint struct {
	Date      string
	Logins    int64
	Uploads   int64
	Downloads int64
	Deletes   int64
	Restores  int64
	Stars     int64
}

type AdminFileTypeStat struct {
	Type       string
	Count      int64
	TotalBytes int64
}

type AdminSizeBucketStat struct {
	Bucket string
	Count  int64
}

type AdminDepthStat struct {
	Depth int
	Count int64
}
