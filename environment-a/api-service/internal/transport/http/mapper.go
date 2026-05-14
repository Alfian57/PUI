package httptransport

import (
	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"github.com/alfiang/pui/environment-a/api-service/internal/transport/http/dto"
	"github.com/alfiang/pui/environment-a/api-service/internal/vaultclient"
)

func toUserDTO(user domain.AuthUser) dto.UserDTO {
	return dto.UserDTO{
		ID:       user.UserID,
		FullName: user.FullName,
		Email:    user.Email,
		Role:     user.Role,
	}
}

func toDirectoryDTO(record domain.DirectoryRecord) dto.DirectoryDTO {
	return dto.DirectoryDTO{
		ID:        record.ID,
		Name:      record.Name,
		Depth:     record.Depth,
		ParentID:  record.ParentID,
		CreatedAt: record.CreatedAt,
		DeletedAt: record.DeletedAt,
		StarredAt: record.StarredAt,
	}
}

func toDirectoryDTOs(records []domain.DirectoryRecord) []dto.DirectoryDTO {
	items := make([]dto.DirectoryDTO, 0, len(records))
	for _, record := range records {
		items = append(items, toDirectoryDTO(record))
	}
	return items
}

func toFileDTO(record domain.FileRecord) dto.FileDTO {
	return dto.FileDTO{
		ID:          record.ID,
		DirectoryID: record.DirectoryID,
		Name:        record.Name,
		SizeBytes:   record.SizeBytes,
		MIMEType:    record.MIMEType,
		ManifestID:  record.ManifestID,
		ChunkCount:  record.ChunkCount,
		NewChunks:   record.NewChunks,
		ReuseChunks: record.ReuseChunks,
		DedupRatio:  record.DedupRatio,
		CreatedAt:   record.CreatedAt,
		DeletedAt:   record.DeletedAt,
		StarredAt:   record.StarredAt,
	}
}

func toFileDTOs(records []domain.FileRecord) []dto.FileDTO {
	items := make([]dto.FileDTO, 0, len(records))
	for _, record := range records {
		items = append(items, toFileDTO(record))
	}
	return items
}

func toUploadCommitResultDTO(result vaultclient.UploadCommitResult) dto.UploadCommitResultDTO {
	return dto.UploadCommitResultDTO{
		ManifestID:      result.ManifestID,
		FileHash:        result.FileHash,
		TotalSizeBytes:  result.TotalSizeBytes,
		ChunkCount:      result.ChunkCount,
		DedupRatio:      result.DedupRatio,
		Immutable:       result.Immutable,
		NewChunkCount:   result.NewChunkCount,
		ReuseChunkCount: result.ReuseChunkCount,
	}
}

func toActivityLogDTO(record domain.ActivityLogRecord) dto.ActivityLogDTO {
	return dto.ActivityLogDTO{
		ID:           record.ID,
		UserID:       record.UserID,
		Action:       record.Action,
		ResourceType: record.ResourceType,
		ResourceID:   record.ResourceID,
		CreatedAt:    record.CreatedAt,
	}
}

func toActivityLogDTOs(records []domain.ActivityLogRecord) []dto.ActivityLogDTO {
	items := make([]dto.ActivityLogDTO, 0, len(records))
	for _, record := range records {
		items = append(items, toActivityLogDTO(record))
	}

	return items
}

func toAdminAnalyticsResponse(record domain.AdminAnalytics) dto.AdminAnalyticsResponse {
	return dto.AdminAnalyticsResponse{
		Status:      "ok",
		Range:       record.Range,
		GeneratedAt: record.GeneratedAt.Format("2006-01-02T15:04:05Z07:00"),
		Summary: dto.AdminAnalyticsSummaryDTO{
			TotalUsers:            record.Summary.TotalUsers,
			TotalAdmins:           record.Summary.TotalAdmins,
			ActiveUsers:           record.Summary.ActiveUsers,
			ActiveFiles:           record.Summary.ActiveFiles,
			ActiveFolders:         record.Summary.ActiveFolders,
			TrashFiles:            record.Summary.TrashFiles,
			TrashFolders:          record.Summary.TrashFolders,
			StarredFiles:          record.Summary.StarredFiles,
			StarredFolders:        record.Summary.StarredFolders,
			ActiveStorageBytes:    record.Summary.ActiveStorageBytes,
			TrashStorageBytes:     record.Summary.TrashStorageBytes,
			TotalChunks:           record.Summary.TotalChunks,
			NewChunks:             record.Summary.NewChunks,
			ReuseChunks:           record.Summary.ReuseChunks,
			DedupRatio:            record.Summary.DedupRatio,
			UploadsInRange:        record.Summary.UploadsInRange,
			DownloadsInRange:      record.Summary.DownloadsInRange,
			DeletedItemsInRange:   record.Summary.DeletedItemsInRange,
			RestoredItemsInRange:  record.Summary.RestoredItemsInRange,
			StarredActionsInRange: record.Summary.StarredActionsInRange,
		},
		Activity:    toAdminActivityPointDTOs(record.Activity),
		FileTypes:   toAdminFileTypeStatDTOs(record.FileTypes),
		SizeBuckets: toAdminSizeBucketStatDTOs(record.SizeBuckets),
		Depths:      toAdminDepthStatDTOs(record.Depths),
	}
}

func toUserInsightResponse(record domain.UserInsight) dto.UserInsightResponse {
	return dto.UserInsightResponse{
		Status:      "ok",
		Range:       record.Range,
		GeneratedAt: record.GeneratedAt.Format("2006-01-02T15:04:05Z07:00"),
		Summary: dto.UserInsightSummaryDTO{
			ActiveFiles:        record.Summary.ActiveFiles,
			ActiveFolders:      record.Summary.ActiveFolders,
			TrashFiles:         record.Summary.TrashFiles,
			TrashFolders:       record.Summary.TrashFolders,
			StarredFiles:       record.Summary.StarredFiles,
			StarredFolders:     record.Summary.StarredFolders,
			ActiveStorageBytes: record.Summary.ActiveStorageBytes,
			TrashStorageBytes:  record.Summary.TrashStorageBytes,
			TotalChunks:        record.Summary.TotalChunks,
			NewChunks:          record.Summary.NewChunks,
			ReuseChunks:        record.Summary.ReuseChunks,
			DedupRatio:         record.Summary.DedupRatio,
			UploadsInRange:     record.Summary.UploadsInRange,
			DownloadsInRange:   record.Summary.DownloadsInRange,
		},
		Activity:     toUserActivityPointDTOs(record.Activity),
		FileTypes:    toUserFileTypeStatDTOs(record.FileTypes),
		LargestFiles: toInsightFileItemDTOs(record.LargestFiles),
		TrashItems:   toInsightTrashItemDTOs(record.TrashItems),
	}
}

func toUserActivityPointDTOs(records []domain.UserActivityPoint) []dto.UserActivityPointDTO {
	items := make([]dto.UserActivityPointDTO, 0, len(records))
	for _, record := range records {
		items = append(items, dto.UserActivityPointDTO(record))
	}
	return items
}

func toUserFileTypeStatDTOs(records []domain.UserFileTypeStat) []dto.UserFileTypeStatDTO {
	items := make([]dto.UserFileTypeStatDTO, 0, len(records))
	for _, record := range records {
		items = append(items, dto.UserFileTypeStatDTO(record))
	}
	return items
}

func toInsightFileItemDTOs(records []domain.InsightFileItem) []dto.InsightFileItemDTO {
	items := make([]dto.InsightFileItemDTO, 0, len(records))
	for _, record := range records {
		items = append(items, dto.InsightFileItemDTO{
			ID:        record.ID,
			Name:      record.Name,
			SizeBytes: record.SizeBytes,
			MIMEType:  record.MIMEType,
			CreatedAt: record.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		})
	}
	return items
}

func toInsightTrashItemDTOs(records []domain.InsightTrashItem) []dto.InsightTrashItemDTO {
	items := make([]dto.InsightTrashItemDTO, 0, len(records))
	for _, record := range records {
		items = append(items, dto.InsightTrashItemDTO{
			ID:        record.ID,
			Kind:      record.Kind,
			Name:      record.Name,
			SizeBytes: record.SizeBytes,
			DeletedAt: record.DeletedAt.Format("2006-01-02T15:04:05Z07:00"),
		})
	}
	return items
}

func toAdminActivityPointDTOs(records []domain.AdminActivityPoint) []dto.AdminActivityPointDTO {
	items := make([]dto.AdminActivityPointDTO, 0, len(records))
	for _, record := range records {
		items = append(items, dto.AdminActivityPointDTO(record))
	}
	return items
}

func toAdminFileTypeStatDTOs(records []domain.AdminFileTypeStat) []dto.AdminFileTypeStatDTO {
	items := make([]dto.AdminFileTypeStatDTO, 0, len(records))
	for _, record := range records {
		items = append(items, dto.AdminFileTypeStatDTO(record))
	}
	return items
}

func toAdminSizeBucketStatDTOs(records []domain.AdminSizeBucketStat) []dto.AdminSizeBucketStatDTO {
	items := make([]dto.AdminSizeBucketStatDTO, 0, len(records))
	for _, record := range records {
		items = append(items, dto.AdminSizeBucketStatDTO(record))
	}
	return items
}

func toAdminDepthStatDTOs(records []domain.AdminDepthStat) []dto.AdminDepthStatDTO {
	items := make([]dto.AdminDepthStatDTO, 0, len(records))
	for _, record := range records {
		items = append(items, dto.AdminDepthStatDTO(record))
	}
	return items
}
