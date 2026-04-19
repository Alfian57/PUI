package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"gorm.io/gorm"
)

type FileRepository struct {
	db *gorm.DB
}

func NewFileRepository(db *gorm.DB) *FileRepository {
	return &FileRepository{db: db}
}

func (r *FileRepository) Create(ctx context.Context, directoryID, name string, sizeBytes int64, mimeType, manifestID string) (domain.FileRecord, error) {
	var out domain.FileRecord
	err := r.db.WithContext(ctx).Raw(
		`INSERT INTO files (directory_id, name, size_bytes, mime_type, manifest_id)
		 VALUES (?::uuid, ?, ?, ?, ?)
		 RETURNING id::text, directory_id::text, name, size_bytes, mime_type, manifest_id, created_at, deleted_at`,
		directoryID,
		name,
		sizeBytes,
		mimeType,
		manifestID,
	).Scan(&out).Error
	if err != nil {
		return domain.FileRecord{}, fmt.Errorf("insert file metadata: %w", err)
	}

	return out, nil
}

func (r *FileRepository) FindByIDForUser(ctx context.Context, fileID, userID string, includeDeleted bool) (domain.FileRecord, error) {
	var out domain.FileRecord
	query := `SELECT f.id::text, f.directory_id::text, f.name, f.size_bytes, f.mime_type, f.manifest_id, f.created_at, f.deleted_at
		FROM files f
		JOIN directories d ON d.id = f.directory_id
		WHERE f.id = ?::uuid
		  AND d.user_id = ?::uuid`
	if !includeDeleted {
		query += ` AND f.deleted_at IS NULL`
	}

	err := r.db.WithContext(ctx).Raw(query, fileID, userID).Scan(&out).Error
	if err != nil {
		return domain.FileRecord{}, fmt.Errorf("query file: %w", err)
	}

	if strings.TrimSpace(out.ID) == "" {
		return domain.FileRecord{}, domain.ErrNotFound
	}

	return out, nil
}

func (r *FileRepository) ListByDirectory(ctx context.Context, userID, directoryID string, includeDeleted bool) ([]domain.FileRecord, error) {
	query := `SELECT f.id::text, f.directory_id::text, f.name, f.size_bytes, f.mime_type, f.manifest_id, f.created_at, f.deleted_at
		FROM files f
		JOIN directories d ON d.id = f.directory_id
		WHERE d.user_id = ?::uuid AND f.directory_id = ?::uuid`
	if !includeDeleted {
		query += ` AND f.deleted_at IS NULL`
	}
	query += ` ORDER BY f.created_at DESC`

	files := make([]domain.FileRecord, 0, 32)
	err := r.db.WithContext(ctx).Raw(query, userID, directoryID).Scan(&files).Error
	if err != nil {
		return nil, fmt.Errorf("query files by directory: %w", err)
	}

	return files, nil
}

func (r *FileRepository) SoftDelete(ctx context.Context, fileID, userID string) (time.Time, error) {
	var deletedAt time.Time
	err := r.db.WithContext(ctx).Raw(
		`UPDATE files f
		 SET deleted_at = NOW()
		 FROM directories d
		 WHERE f.id = ?::uuid
		   AND f.directory_id = d.id
		   AND d.user_id = ?::uuid
		   AND f.deleted_at IS NULL
		 RETURNING f.deleted_at`,
		fileID,
		userID,
	).Scan(&deletedAt).Error
	if err != nil {
		return time.Time{}, fmt.Errorf("soft delete file: %w", err)
	}

	if deletedAt.IsZero() {
		return time.Time{}, domain.ErrNotFound
	}

	return deletedAt, nil
}

func (r *FileRepository) ExistsActiveByDirectoryAndName(ctx context.Context, directoryID, name string) (bool, error) {
	var exists bool
	err := r.db.WithContext(ctx).Raw(
		`SELECT EXISTS (
			SELECT 1
			FROM files
			WHERE directory_id = ?::uuid
			  AND deleted_at IS NULL
			  AND lower(name) = lower(?)
		)`,
		directoryID,
		name,
	).Scan(&exists).Error
	if err != nil {
		return false, fmt.Errorf("check duplicate active filename: %w", err)
	}

	return exists, nil
}

func (r *FileRepository) SearchByUser(ctx context.Context, userID string, filter domain.FileSearchFilter) ([]domain.FileRecord, int64, error) {
	where := ` WHERE d.user_id = ?::uuid`
	args := []any{userID}

	if strings.TrimSpace(filter.DirectoryID) != "" {
		where += ` AND f.directory_id = ?::uuid`
		args = append(args, filter.DirectoryID)
	}

	if !filter.IncludeDeleted {
		where += ` AND f.deleted_at IS NULL`
	}

	if strings.TrimSpace(filter.Query) != "" {
		pattern := "%" + strings.TrimSpace(filter.Query) + "%"
		where += ` AND (f.name ILIKE ? OR f.manifest_id ILIKE ? OR f.mime_type ILIKE ?)`
		args = append(args, pattern, pattern, pattern)
	}

	var total int64
	countQuery := `SELECT COUNT(*)
		FROM files f
		JOIN directories d ON d.id = f.directory_id` + where
	if err := r.db.WithContext(ctx).Raw(countQuery, args...).Scan(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count searched files: %w", err)
	}

	listQuery := `SELECT f.id::text, f.directory_id::text, f.name, f.size_bytes, f.mime_type, f.manifest_id, f.created_at, f.deleted_at
		FROM files f
		JOIN directories d ON d.id = f.directory_id` + where + ` ORDER BY f.created_at DESC LIMIT ? OFFSET ?`
	listArgs := append(append([]any{}, args...), filter.Limit, filter.Offset)

	files := make([]domain.FileRecord, 0, filter.Limit)
	if err := r.db.WithContext(ctx).Raw(listQuery, listArgs...).Scan(&files).Error; err != nil {
		return nil, 0, fmt.Errorf("search files: %w", err)
	}

	return files, total, nil
}
