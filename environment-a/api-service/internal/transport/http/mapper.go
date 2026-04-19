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
	}
}

func toDirectoryDTO(record domain.DirectoryRecord) dto.DirectoryDTO {
	return dto.DirectoryDTO{
		ID:        record.ID,
		Name:      record.Name,
		Depth:     record.Depth,
		ParentID:  record.ParentID,
		CreatedAt: record.CreatedAt,
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
		CreatedAt:   record.CreatedAt,
		DeletedAt:   record.DeletedAt,
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
