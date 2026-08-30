package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"github.com/alfiang/pui/environment-a/api-service/internal/vaultclient"
	"github.com/jackc/pgx/v5/pgconn"
	"gorm.io/gorm"
)

const fileSelectColumns = `
	f.id_berkas::text AS id,
	f.id_direktori::text AS directory_id,
	f.nama AS name,
	f.ukuran AS size_bytes,
	f.mime_type,
	COALESCE(f.id_manifest, '') AS manifest_id,
	f.status_penyimpanan AS storage_status,
	f.chunk_count,
	f.new_chunk_count,
	f.reuse_chunk_count,
	f.dedup_ratio,
	f.dibuat_pada AS created_at,
	f.dihapus_pada AS deleted_at,
	f.dibintangi_pada AS starred_at`

const fileReturningColumns = `
	id_berkas::text AS id,
	id_direktori::text AS directory_id,
	nama AS name,
	ukuran AS size_bytes,
	mime_type,
	COALESCE(id_manifest, '') AS manifest_id,
	status_penyimpanan AS storage_status,
	chunk_count,
	new_chunk_count,
	reuse_chunk_count,
	dedup_ratio,
	dibuat_pada AS created_at,
	dihapus_pada AS deleted_at,
	dibintangi_pada AS starred_at`

type FileRepository struct {
	db *gorm.DB
}

func NewFileRepository(db *gorm.DB) *FileRepository {
	return &FileRepository{db: db}
}

// isUniqueViolation returns true if err is a PostgreSQL unique_violation (23505).
func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505"
	}
	return false
}

func (r *FileRepository) CreatePending(ctx context.Context, userID, directoryID, name, mimeType string) (domain.FileRecord, error) {
	var out domain.FileRecord
	err := r.db.WithContext(ctx).Raw(
		`INSERT INTO files (id_pengguna, id_direktori, nama, ukuran, mime_type, id_manifest, status_penyimpanan, chunk_count, new_chunk_count, reuse_chunk_count, dedup_ratio)
		 VALUES (?::uuid, NULLIF(?, '')::uuid, ?, 0, ?, NULL, 'pending', 0, 0, 0, 0)
		 RETURNING `+fileReturningColumns,
		userID,
		directoryID,
		name,
		mimeType,
	).Scan(&out).Error
	if err != nil {
		if isUniqueViolation(err) {
			return domain.FileRecord{}, fmt.Errorf("%w: nama berkas sudah ada pada direktori", domain.ErrConflict)
		}
		return domain.FileRecord{}, fmt.Errorf("insert pending file metadata: %w", err)
	}

	return out, nil
}

func (r *FileRepository) MarkCommitted(ctx context.Context, fileID, userID string, result vaultclient.UploadCommitResult) (domain.FileRecord, error) {
	var out domain.FileRecord
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := lockManifestLifecycle(ctx, tx, result.ManifestID); err != nil {
			return err
		}

		return tx.Raw(
			`UPDATE files f
			 SET ukuran = ?,
			     id_manifest = ?,
			     status_penyimpanan = 'committed',
			     dibuat_pada = NOW(),
			     chunk_count = ?,
			     new_chunk_count = ?,
			     reuse_chunk_count = ?,
			     dedup_ratio = ?
			 WHERE f.id_berkas = ?::uuid
			   AND f.id_pengguna = ?::uuid
			   AND f.status_penyimpanan = 'pending'
			 RETURNING `+fileSelectColumns,
			result.TotalSizeBytes,
			result.ManifestID,
			result.ChunkCount,
			result.NewChunkCount,
			result.ReuseChunkCount,
			result.DedupRatio,
			fileID,
			userID,
		).Scan(&out).Error
	})
	if err != nil {
		return domain.FileRecord{}, fmt.Errorf("mark file committed: %w", err)
	}
	if out.ID == "" {
		return domain.FileRecord{}, domain.ErrNotFound
	}

	return out, nil
}

func (r *FileRepository) MarkFailed(ctx context.Context, fileID, userID string) error {
	result := r.db.WithContext(ctx).Exec(
		`UPDATE files
		 SET status_penyimpanan = 'failed'
		 WHERE id_berkas = ?::uuid
		   AND id_pengguna = ?::uuid
		   AND status_penyimpanan = 'pending'`,
		fileID,
		userID,
	)
	if result.Error != nil {
		return fmt.Errorf("mark file failed: %w", result.Error)
	}

	return nil
}

func (r *FileRepository) FindByIDForUser(ctx context.Context, fileID, userID string, includeDeleted bool) (domain.FileRecord, error) {
	var out domain.FileRecord
	query := `SELECT ` + fileSelectColumns + `
		FROM files f
		LEFT JOIN directories d ON d.id_direktori = f.id_direktori
		WHERE f.id_berkas = ?::uuid
		  AND f.id_pengguna = ?::uuid
		  AND f.status_penyimpanan = 'committed'`
	if !includeDeleted {
		query += ` AND (f.id_direktori IS NULL OR d.dihapus_pada IS NULL)`
	}
	if !includeDeleted {
		query += ` AND f.dihapus_pada IS NULL`
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
	query := `SELECT ` + fileSelectColumns + `
		FROM files f
		LEFT JOIN directories d ON d.id_direktori = f.id_direktori
		WHERE f.id_pengguna = ?::uuid
		  AND f.status_penyimpanan = 'committed'`
	args := []any{userID}

	if strings.TrimSpace(directoryID) == "" {
		query += ` AND f.id_direktori IS NULL`
	} else {
		query += ` AND f.id_direktori = ?::uuid`
		if !includeDeleted {
			query += ` AND d.dihapus_pada IS NULL`
		}
		args = append(args, directoryID)
	}

	if !includeDeleted {
		query += ` AND f.dihapus_pada IS NULL`
	}
	query += ` ORDER BY f.dibuat_pada DESC`

	files := make([]domain.FileRecord, 0, 32)
	err := r.db.WithContext(ctx).Raw(query, args...).Scan(&files).Error
	if err != nil {
		return nil, fmt.Errorf("query files by directory: %w", err)
	}

	return files, nil
}

func (r *FileRepository) ListByDirectoryPage(ctx context.Context, userID string, filter domain.FileListFilter) ([]domain.FileRecord, int64, domain.FileListStats, error) {
	where := ` WHERE f.id_pengguna = ?::uuid AND f.status_penyimpanan = 'committed'`
	args := []any{userID}

	if strings.TrimSpace(filter.DirectoryID) == "" {
		where += ` AND f.id_direktori IS NULL`
	} else {
		where += ` AND f.id_direktori = ?::uuid`
		if !filter.IncludeDeleted {
			where += ` AND d.dihapus_pada IS NULL`
		}
		args = append(args, filter.DirectoryID)
	}

	if !filter.IncludeDeleted {
		where += ` AND f.dihapus_pada IS NULL`
	}
	if filter.CreatedFrom != nil {
		where += ` AND f.dibuat_pada >= ?`
		args = append(args, *filter.CreatedFrom)
	}
	if filter.CreatedTo != nil {
		where += ` AND f.dibuat_pada <= ?`
		args = append(args, *filter.CreatedTo)
	}

	var summary struct {
		Total        int64 `gorm:"column:total"`
		TotalBytes   int64 `gorm:"column:total_bytes"`
		TotalChunks  int   `gorm:"column:total_chunks"`
		ReusedChunks int   `gorm:"column:reused_chunks"`
	}
	countQuery := `SELECT COUNT(*) AS total,
		COALESCE(SUM(f.ukuran), 0) AS total_bytes,
		COALESCE(SUM(f.chunk_count), 0) AS total_chunks,
		COALESCE(SUM(f.reuse_chunk_count), 0) AS reused_chunks
		FROM files f
		LEFT JOIN directories d ON d.id_direktori = f.id_direktori` + where
	if err := r.db.WithContext(ctx).Raw(countQuery, args...).Scan(&summary).Error; err != nil {
		return nil, 0, domain.FileListStats{}, fmt.Errorf("count files by directory: %w", err)
	}

	orderBy := fileListOrderBy(filter.Sort)
	listQuery := `SELECT ` + fileSelectColumns + `
		FROM files f
		LEFT JOIN directories d ON d.id_direktori = f.id_direktori` + where + ` ORDER BY ` + orderBy + ` LIMIT ? OFFSET ?`
	listArgs := append(append([]any{}, args...), filter.Limit, filter.Offset)
	files := make([]domain.FileRecord, 0, filter.Limit)
	if err := r.db.WithContext(ctx).Raw(listQuery, listArgs...).Scan(&files).Error; err != nil {
		return nil, 0, domain.FileListStats{}, fmt.Errorf("query files by directory page: %w", err)
	}

	return files, summary.Total, domain.FileListStats{
		TotalBytes:   summary.TotalBytes,
		TotalChunks:  summary.TotalChunks,
		ReusedChunks: summary.ReusedChunks,
	}, nil
}

func fileListOrderBy(sort string) string {
	switch sort {
	case "oldest":
		return "f.dibuat_pada ASC, f.id_berkas ASC"
	case "name-asc", "type":
		return "lower(f.nama) ASC, f.id_berkas ASC"
	case "name-desc":
		return "lower(f.nama) DESC, f.id_berkas DESC"
	case "starred":
		return "f.dibintangi_pada DESC NULLS LAST, f.dibuat_pada DESC, f.id_berkas DESC"
	default:
		return "f.dibuat_pada DESC, f.id_berkas DESC"
	}
}

func (r *FileRepository) SoftDelete(ctx context.Context, fileID, userID string) (time.Time, error) {
	var deletedAt time.Time
	err := r.db.WithContext(ctx).Raw(
		`UPDATE files f
		 SET dihapus_pada = NOW()
		 WHERE f.id_berkas = ?::uuid
		   AND f.id_pengguna = ?::uuid
		   AND f.status_penyimpanan = 'committed'
		   AND (
		       f.id_direktori IS NULL
		       OR EXISTS (SELECT 1 FROM directories d WHERE d.id_direktori = f.id_direktori AND d.dihapus_pada IS NULL)
		   )
		   AND f.dihapus_pada IS NULL
		 RETURNING f.dihapus_pada`,
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

func (r *FileRepository) Restore(ctx context.Context, fileID, userID string) (domain.FileRecord, error) {
	var out domain.FileRecord
	err := r.db.WithContext(ctx).Raw(
		`UPDATE files f
		 SET dihapus_pada = NULL
		 WHERE f.id_berkas = ?::uuid
		   AND f.id_pengguna = ?::uuid
		   AND f.status_penyimpanan = 'committed'
		   AND (
		       f.id_direktori IS NULL
		       OR EXISTS (SELECT 1 FROM directories d WHERE d.id_direktori = f.id_direktori AND d.dihapus_pada IS NULL)
		   )
		   AND f.dihapus_pada IS NOT NULL
		 RETURNING `+fileSelectColumns,
		fileID,
		userID,
	).Scan(&out).Error
	if err != nil {
		return domain.FileRecord{}, fmt.Errorf("restore file: %w", err)
	}
	if out.ID == "" {
		return domain.FileRecord{}, domain.ErrNotFound
	}

	return out, nil
}

func (r *FileRepository) PermanentDelete(ctx context.Context, fileID, userID string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var manifestRows []manifestIDRow
		if err := tx.Raw(
			`SELECT COALESCE(f.id_manifest, '') AS manifest_id
			 FROM files f
			 WHERE f.id_berkas = ?::uuid
			   AND f.id_pengguna = ?::uuid
			   AND f.status_penyimpanan = 'committed'
			   AND (
			       f.id_direktori IS NULL
			       OR EXISTS (SELECT 1 FROM directories d WHERE d.id_direktori = f.id_direktori AND d.dihapus_pada IS NULL)
			   )
			   AND f.dihapus_pada IS NOT NULL
			 FOR UPDATE`,
			fileID,
			userID,
		).Scan(&manifestRows).Error; err != nil {
			return fmt.Errorf("find file for permanent delete: %w", err)
		}
		if len(manifestRows) == 0 {
			return domain.ErrNotFound
		}
		manifestIDsToLock := make([]string, 0, len(manifestRows))
		for _, row := range manifestRows {
			manifestIDsToLock = append(manifestIDsToLock, row.ManifestID)
		}
		if err := lockManifestLifecycles(ctx, tx, manifestIDsToLock); err != nil {
			return err
		}

		var deletedRows []manifestIDRow
		if err := tx.Raw(
			`DELETE FROM files f
			 WHERE f.id_berkas = ?::uuid
			   AND f.id_pengguna = ?::uuid
			   AND f.status_penyimpanan = 'committed'
			   AND (
			       f.id_direktori IS NULL
			       OR EXISTS (SELECT 1 FROM directories d WHERE d.id_direktori = f.id_direktori AND d.dihapus_pada IS NULL)
			   )
			   AND f.dihapus_pada IS NOT NULL
			 RETURNING COALESCE(f.id_manifest, '') AS manifest_id`,
			fileID,
			userID,
		).Scan(&deletedRows).Error; err != nil {
			return fmt.Errorf("permanent delete file: %w", err)
		}
		if len(deletedRows) == 0 {
			return domain.ErrNotFound
		}

		manifestIDs := make([]string, 0, len(deletedRows))
		for _, row := range deletedRows {
			if strings.TrimSpace(row.ManifestID) != "" {
				manifestIDs = append(manifestIDs, row.ManifestID)
			}
		}

		if err := queueManifestRetirements(ctx, tx, manifestIDs); err != nil {
			return err
		}
		return nil
	})
}

func (r *FileRepository) SetStarred(ctx context.Context, fileID, userID string, starred bool) (domain.FileRecord, error) {
	var out domain.FileRecord
	value := "NOW()"
	if !starred {
		value = "NULL"
	}
	err := r.db.WithContext(ctx).Raw(
		fmt.Sprintf(
			`UPDATE files f
			 SET dibintangi_pada = %s
			 WHERE f.id_berkas = ?::uuid
			   AND f.id_pengguna = ?::uuid
			   AND f.status_penyimpanan = 'committed'
			   AND (
			       f.id_direktori IS NULL
			       OR EXISTS (SELECT 1 FROM directories d WHERE d.id_direktori = f.id_direktori AND d.dihapus_pada IS NULL)
			   )
			   AND f.dihapus_pada IS NULL
			 RETURNING `+fileSelectColumns,
			value,
		),
		fileID,
		userID,
	).Scan(&out).Error
	if err != nil {
		return domain.FileRecord{}, fmt.Errorf("set file starred: %w", err)
	}
	if out.ID == "" {
		return domain.FileRecord{}, domain.ErrNotFound
	}

	return out, nil
}

func (r *FileRepository) ExistsActiveByDirectoryAndName(ctx context.Context, userID, directoryID, name string) (bool, error) {
	var exists bool
	query := `SELECT EXISTS (
		SELECT 1
		FROM files
		WHERE id_pengguna = ?::uuid
		  AND dihapus_pada IS NULL
		  AND status_penyimpanan IN ('pending', 'committed')
		  AND lower(nama) = lower(?)`
	args := []any{userID, name}
	if strings.TrimSpace(directoryID) == "" {
		query += ` AND id_direktori IS NULL`
	} else {
		query += ` AND id_direktori = ?::uuid`
		args = append(args, directoryID)
	}
	query += `)`

	err := r.db.WithContext(ctx).Raw(query, args...).Scan(&exists).Error
	if err != nil {
		return false, fmt.Errorf("check duplicate active filename: %w", err)
	}

	return exists, nil
}

func (r *FileRepository) SearchByUser(ctx context.Context, userID string, filter domain.FileSearchFilter) ([]domain.FileRecord, int64, error) {
	where := ` WHERE f.id_pengguna = ?::uuid AND f.status_penyimpanan = 'committed' AND (f.id_direktori IS NULL OR d.dihapus_pada IS NULL)`
	args := []any{userID}

	if strings.TrimSpace(filter.DirectoryID) != "" {
		where += ` AND f.id_direktori = ?::uuid`
		args = append(args, filter.DirectoryID)
	}

	if !filter.IncludeDeleted {
		where += ` AND f.dihapus_pada IS NULL`
	}

	if strings.TrimSpace(filter.Query) != "" {
		pattern := "%" + strings.TrimSpace(filter.Query) + "%"
		where += ` AND (f.nama ILIKE ? OR f.id_manifest ILIKE ? OR f.mime_type ILIKE ?)`
		args = append(args, pattern, pattern, pattern)
	}

	var total int64
	countQuery := `SELECT COUNT(*)
		FROM files f
		LEFT JOIN directories d ON d.id_direktori = f.id_direktori` + where
	if err := r.db.WithContext(ctx).Raw(countQuery, args...).Scan(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count searched files: %w", err)
	}

	listQuery := `SELECT ` + fileSelectColumns + `
		FROM files f
		LEFT JOIN directories d ON d.id_direktori = f.id_direktori` + where + ` ORDER BY f.dibuat_pada DESC LIMIT ? OFFSET ?`
	listArgs := append(append([]any{}, args...), filter.Limit, filter.Offset)

	files := make([]domain.FileRecord, 0, filter.Limit)
	if err := r.db.WithContext(ctx).Raw(listQuery, listArgs...).Scan(&files).Error; err != nil {
		return nil, 0, fmt.Errorf("search files: %w", err)
	}

	return files, total, nil
}

func (r *FileRepository) ListTrash(ctx context.Context, userID string) ([]domain.FileRecord, error) {
	files := make([]domain.FileRecord, 0, 32)
	err := r.db.WithContext(ctx).Raw(
		`SELECT `+fileSelectColumns+`
		 FROM files f
		 LEFT JOIN directories d ON d.id_direktori = f.id_direktori
		 WHERE f.id_pengguna = ?::uuid
		   AND f.status_penyimpanan = 'committed'
		   AND (f.id_direktori IS NULL OR d.dihapus_pada IS NULL)
		   AND f.dihapus_pada IS NOT NULL
		 ORDER BY f.dihapus_pada DESC, f.nama`,
		userID,
	).Scan(&files).Error
	if err != nil {
		return nil, fmt.Errorf("query trash files: %w", err)
	}

	return files, nil
}

func (r *FileRepository) ListStarred(ctx context.Context, userID string) ([]domain.FileRecord, error) {
	files := make([]domain.FileRecord, 0, 32)
	err := r.db.WithContext(ctx).Raw(
		`SELECT `+fileSelectColumns+`
		 FROM files f
		 LEFT JOIN directories d ON d.id_direktori = f.id_direktori
		 WHERE f.id_pengguna = ?::uuid
		   AND f.status_penyimpanan = 'committed'
		   AND (f.id_direktori IS NULL OR d.dihapus_pada IS NULL)
		   AND f.dihapus_pada IS NULL
		   AND f.dibintangi_pada IS NOT NULL
		 ORDER BY f.dibintangi_pada DESC, f.nama`,
		userID,
	).Scan(&files).Error
	if err != nil {
		return nil, fmt.Errorf("query starred files: %w", err)
	}

	return files, nil
}

func (r *FileRepository) ListTrashPage(ctx context.Context, userID string, limit, offset int) ([]domain.FileRecord, int64, error) {
	return r.listWorkspaceFilesPage(ctx, userID, "trash", limit, offset)
}

func (r *FileRepository) ListStarredPage(ctx context.Context, userID string, limit, offset int) ([]domain.FileRecord, int64, error) {
	return r.listWorkspaceFilesPage(ctx, userID, "starred", limit, offset)
}

func (r *FileRepository) listWorkspaceFilesPage(ctx context.Context, userID, mode string, limit, offset int) ([]domain.FileRecord, int64, error) {
	where := ` WHERE f.id_pengguna = ?::uuid
		AND f.status_penyimpanan = 'committed'
		AND (f.id_direktori IS NULL OR d.dihapus_pada IS NULL)`
	args := []any{userID}
	orderBy := "f.nama ASC, f.id_berkas ASC"
	if mode == "trash" {
		where += ` AND f.dihapus_pada IS NOT NULL`
		orderBy = "f.dihapus_pada DESC, lower(f.nama) ASC, f.id_berkas ASC"
	} else {
		where += ` AND f.dihapus_pada IS NULL AND f.dibintangi_pada IS NOT NULL`
		orderBy = "f.dibintangi_pada DESC, lower(f.nama) ASC, f.id_berkas ASC"
	}

	var total int64
	countQuery := `SELECT COUNT(*)
		FROM files f
		LEFT JOIN directories d ON d.id_direktori = f.id_direktori` + where
	if err := r.db.WithContext(ctx).Raw(countQuery, args...).Scan(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count %s files: %w", mode, err)
	}

	listQuery := `SELECT ` + fileSelectColumns + `
		FROM files f
		LEFT JOIN directories d ON d.id_direktori = f.id_direktori` + where + ` ORDER BY ` + orderBy + ` LIMIT ? OFFSET ?`
	listArgs := append(append([]any{}, args...), limit, offset)
	files := make([]domain.FileRecord, 0, limit)
	if err := r.db.WithContext(ctx).Raw(listQuery, listArgs...).Scan(&files).Error; err != nil {
		return nil, 0, fmt.Errorf("query %s files page: %w", mode, err)
	}

	return files, total, nil
}

// ExpireStalePending marks pending file records older than olderThan as failed,
// releasing their locked filenames so new uploads can reuse those names.
func (r *FileRepository) ExpireStalePending(ctx context.Context, olderThan time.Time) (int64, error) {
	result := r.db.WithContext(ctx).Exec(
		`UPDATE files
		 SET status_penyimpanan = 'failed'
		 WHERE status_penyimpanan = 'pending'
		   AND dibuat_pada < ?`,
		olderThan,
	)
	if result.Error != nil {
		return 0, fmt.Errorf("expire stale pending files: %w", result.Error)
	}
	return result.RowsAffected, nil
}
