package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"gorm.io/gorm"
)

type InsightRepository struct {
	db *gorm.DB
}

func NewInsightRepository(db *gorm.DB) *InsightRepository {
	return &InsightRepository{db: db}
}

func (r *InsightRepository) UserInsight(ctx context.Context, userID string, since time.Time) (domain.UserInsight, error) {
	var out domain.UserInsight
	if err := r.db.WithContext(ctx).Raw(
		`SELECT
			(SELECT COUNT(*) FROM files f LEFT JOIN directories d ON d.id = f.directory_id WHERE f.user_id = ?::uuid AND f.deleted_at IS NULL AND (f.directory_id IS NULL OR d.deleted_at IS NULL)) AS active_files,
			(SELECT COUNT(*) FROM directories WHERE user_id = ?::uuid AND deleted_at IS NULL) AS active_folders,
			(SELECT COUNT(*) FROM files f LEFT JOIN directories d ON d.id = f.directory_id WHERE f.user_id = ?::uuid AND f.deleted_at IS NOT NULL AND (f.directory_id IS NULL OR d.deleted_at IS NULL)) AS trash_files,
			(SELECT COUNT(*) FROM directories d WHERE d.user_id = ?::uuid AND d.deleted_at IS NOT NULL AND NOT EXISTS (
				SELECT 1 FROM directory_closure dc JOIN directories a ON a.id = dc.ancestor_id
				WHERE dc.descendant_id = d.id AND dc.depth > 0 AND a.deleted_at IS NOT NULL
			)) AS trash_folders,
			(SELECT COUNT(*) FROM files f LEFT JOIN directories d ON d.id = f.directory_id WHERE f.user_id = ?::uuid AND f.deleted_at IS NULL AND (f.directory_id IS NULL OR d.deleted_at IS NULL) AND f.starred_at IS NOT NULL) AS starred_files,
			(SELECT COUNT(*) FROM directories WHERE user_id = ?::uuid AND deleted_at IS NULL AND starred_at IS NOT NULL) AS starred_folders,
			COALESCE((SELECT SUM(f.size_bytes) FROM files f LEFT JOIN directories d ON d.id = f.directory_id WHERE f.user_id = ?::uuid AND f.deleted_at IS NULL AND (f.directory_id IS NULL OR d.deleted_at IS NULL)), 0) AS active_storage_bytes,
			COALESCE((SELECT SUM(f.size_bytes) FROM files f LEFT JOIN directories d ON d.id = f.directory_id WHERE f.user_id = ?::uuid AND (f.deleted_at IS NOT NULL OR d.deleted_at IS NOT NULL)), 0) AS trash_storage_bytes,
			COALESCE((SELECT SUM(f.chunk_count) FROM files f LEFT JOIN directories d ON d.id = f.directory_id WHERE f.user_id = ?::uuid AND f.deleted_at IS NULL AND (f.directory_id IS NULL OR d.deleted_at IS NULL)), 0) AS total_chunks,
			COALESCE((SELECT SUM(f.new_chunk_count) FROM files f LEFT JOIN directories d ON d.id = f.directory_id WHERE f.user_id = ?::uuid AND f.deleted_at IS NULL AND (f.directory_id IS NULL OR d.deleted_at IS NULL)), 0) AS new_chunks,
			COALESCE((SELECT SUM(f.reuse_chunk_count) FROM files f LEFT JOIN directories d ON d.id = f.directory_id WHERE f.user_id = ?::uuid AND f.deleted_at IS NULL AND (f.directory_id IS NULL OR d.deleted_at IS NULL)), 0) AS reuse_chunks,
			COALESCE((SELECT CASE WHEN SUM(f.chunk_count) > 0 THEN SUM(f.reuse_chunk_count)::float / SUM(f.chunk_count) ELSE 0 END FROM files f LEFT JOIN directories d ON d.id = f.directory_id WHERE f.user_id = ?::uuid AND f.deleted_at IS NULL AND (f.directory_id IS NULL OR d.deleted_at IS NULL)), 0) AS dedup_ratio,
			(SELECT COUNT(*) FROM activity_logs WHERE user_id = ?::uuid AND created_at >= ? AND action = 'UPLOAD') AS uploads_in_range,
			(SELECT COUNT(*) FROM activity_logs WHERE user_id = ?::uuid AND created_at >= ? AND action = 'DOWNLOAD') AS downloads_in_range`,
		userID, userID, userID, userID, userID, userID, userID, userID, userID, userID, userID, userID, userID, since, userID, since,
	).Scan(&out.Summary).Error; err != nil {
		return domain.UserInsight{}, fmt.Errorf("query user insight summary: %w", err)
	}

	if err := r.db.WithContext(ctx).Raw(
		`WITH days AS (
			SELECT generate_series(?::date, CURRENT_DATE, INTERVAL '1 day')::date AS day
		)
		SELECT
			to_char(days.day, 'YYYY-MM-DD') AS date,
			COALESCE(COUNT(*) FILTER (WHERE l.action = 'UPLOAD'), 0) AS uploads,
			COALESCE(COUNT(*) FILTER (WHERE l.action = 'DOWNLOAD'), 0) AS downloads,
			COALESCE(COUNT(*) FILTER (WHERE l.action IN ('DELETE_SOFT', 'DELETE_DIRECTORY_SOFT', 'DELETE_FILE_PERMANENT', 'DELETE_DIRECTORY_PERMANENT')), 0) AS deletes,
			COALESCE(COUNT(*) FILTER (WHERE l.action IN ('RESTORE_FILE', 'RESTORE_DIRECTORY')), 0) AS restores,
			COALESCE(COUNT(*) FILTER (WHERE l.action IN ('STAR_FILE', 'UNSTAR_FILE', 'STAR_DIRECTORY', 'UNSTAR_DIRECTORY')), 0) AS stars
		FROM days
		LEFT JOIN activity_logs l ON l.created_at::date = days.day AND l.user_id = ?::uuid
		GROUP BY days.day
		ORDER BY days.day`,
		since, userID,
	).Scan(&out.Activity).Error; err != nil {
		return domain.UserInsight{}, fmt.Errorf("query user insight activity: %w", err)
	}

	if err := r.db.WithContext(ctx).Raw(
		`SELECT
			CASE
				WHEN f.mime_type = '' THEN 'unknown'
				WHEN position('/' IN f.mime_type) > 0 THEN split_part(f.mime_type, '/', 1)
				ELSE f.mime_type
			END AS type,
			COUNT(*) AS count,
			COALESCE(SUM(f.size_bytes), 0) AS total_bytes
		FROM files f
		LEFT JOIN directories d ON d.id = f.directory_id
		WHERE f.user_id = ?::uuid AND f.deleted_at IS NULL AND (f.directory_id IS NULL OR d.deleted_at IS NULL)
		GROUP BY type
		ORDER BY count DESC, type
		LIMIT 8`,
		userID,
	).Scan(&out.FileTypes).Error; err != nil {
		return domain.UserInsight{}, fmt.Errorf("query user insight file types: %w", err)
	}

	if err := r.db.WithContext(ctx).Raw(
		`SELECT f.id::text, f.name, f.size_bytes, f.mime_type, f.created_at
		FROM files f
		LEFT JOIN directories d ON d.id = f.directory_id
		WHERE f.user_id = ?::uuid AND f.deleted_at IS NULL AND (f.directory_id IS NULL OR d.deleted_at IS NULL)
		ORDER BY f.size_bytes DESC, f.created_at DESC
		LIMIT 6`,
		userID,
	).Scan(&out.LargestFiles).Error; err != nil {
		return domain.UserInsight{}, fmt.Errorf("query user insight largest files: %w", err)
	}

	if err := r.db.WithContext(ctx).Raw(
		`SELECT id::text, kind, name, size_bytes, deleted_at
		FROM (
			SELECT f.id, 'file' AS kind, f.name, f.size_bytes, f.deleted_at
			FROM files f
			LEFT JOIN directories d ON d.id = f.directory_id
			WHERE f.user_id = ?::uuid AND f.deleted_at IS NOT NULL AND (f.directory_id IS NULL OR d.deleted_at IS NULL)
			UNION ALL
			SELECT d.id, 'folder' AS kind, d.name, 0::bigint AS size_bytes, d.deleted_at
			FROM directories d
			WHERE d.user_id = ?::uuid AND d.deleted_at IS NOT NULL AND NOT EXISTS (
				SELECT 1 FROM directory_closure dc JOIN directories a ON a.id = dc.ancestor_id
				WHERE dc.descendant_id = d.id AND dc.depth > 0 AND a.deleted_at IS NOT NULL
			)
		) trash
		ORDER BY deleted_at ASC, name
		LIMIT 6`,
		userID, userID,
	).Scan(&out.TrashItems).Error; err != nil {
		return domain.UserInsight{}, fmt.Errorf("query user insight trash items: %w", err)
	}

	return out, nil
}
