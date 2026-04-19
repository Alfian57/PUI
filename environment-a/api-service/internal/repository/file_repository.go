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
