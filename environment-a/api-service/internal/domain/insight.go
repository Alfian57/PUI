package domain

import "time"

type UserInsight struct {
	Range        string
	GeneratedAt  time.Time
	Summary      UserInsightSummary
	Activity     []UserActivityPoint
	FileTypes    []UserFileTypeStat
	LargestFiles []InsightFileItem
	TrashItems   []InsightTrashItem
}

type UserInsightSummary struct {
	ActiveFiles        int64
	ActiveFolders      int64
	TrashFiles         int64
	TrashFolders       int64
	StarredFiles       int64
	StarredFolders     int64
	ActiveStorageBytes int64
	TrashStorageBytes  int64
	TotalChunks        int64
	NewChunks          int64
	ReuseChunks        int64
	DedupRatio         float64
	UploadsInRange     int64
	DownloadsInRange   int64
}

type UserActivityPoint struct {
	Date      string
	Uploads   int64
	Downloads int64
	Deletes   int64
	Restores  int64
	Stars     int64
}

type UserFileTypeStat struct {
	Type       string
	Count      int64
	TotalBytes int64
}

type InsightFileItem struct {
	ID        string
	Name      string
	SizeBytes int64
	MIMEType  string
	CreatedAt time.Time
}

type InsightTrashItem struct {
	ID        string
	Kind      string
	Name      string
	SizeBytes int64
	DeletedAt time.Time
}
