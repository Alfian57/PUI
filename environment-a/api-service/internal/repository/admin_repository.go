package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"gorm.io/gorm"
)

type AdminRepository struct {
	db *gorm.DB
}

func NewAdminRepository(db *gorm.DB) *AdminRepository {
	return &AdminRepository{db: db}
}

func (r *AdminRepository) Analytics(ctx context.Context, since time.Time) (domain.AdminAnalytics, error) {
	var out domain.AdminAnalytics
	if err := r.db.WithContext(ctx).Raw(
		`SELECT
			(SELECT COUNT(*) FROM users WHERE role = 'user') AS total_users,
			(SELECT COUNT(*) FROM users WHERE role = 'admin') AS total_admins,
			(SELECT COUNT(DISTINCT l.user_id) FROM activity_logs l JOIN users u ON u.id = l.user_id WHERE u.role = 'user' AND l.created_at >= ? AND l.action IN ('LOGIN', 'UPLOAD', 'DOWNLOAD', 'CREATE_DIRECTORY', 'DELETE_SOFT', 'DELETE_DIRECTORY_SOFT', 'RESTORE_FILE', 'RESTORE_DIRECTORY')) AS active_users,
			(SELECT COUNT(*) FROM files f LEFT JOIN directories d ON d.id = f.directory_id WHERE f.deleted_at IS NULL AND (f.directory_id IS NULL OR d.deleted_at IS NULL)) AS active_files,
			(SELECT COUNT(*) FROM directories WHERE deleted_at IS NULL) AS active_folders,
			(SELECT COUNT(*) FROM files f LEFT JOIN directories d ON d.id = f.directory_id WHERE f.deleted_at IS NOT NULL AND (f.directory_id IS NULL OR d.deleted_at IS NULL)) AS trash_files,
			(SELECT COUNT(*) FROM directories d WHERE d.deleted_at IS NOT NULL AND NOT EXISTS (
				SELECT 1 FROM directory_closure dc JOIN directories a ON a.id = dc.ancestor_id
				WHERE dc.descendant_id = d.id AND dc.depth > 0 AND a.deleted_at IS NOT NULL
			)) AS trash_folders,
			(SELECT COUNT(*) FROM files f LEFT JOIN directories d ON d.id = f.directory_id WHERE f.deleted_at IS NULL AND (f.directory_id IS NULL OR d.deleted_at IS NULL) AND f.starred_at IS NOT NULL) AS starred_files,
			(SELECT COUNT(*) FROM directories WHERE deleted_at IS NULL AND starred_at IS NOT NULL) AS starred_folders,
			COALESCE((SELECT SUM(f.size_bytes) FROM files f LEFT JOIN directories d ON d.id = f.directory_id WHERE f.deleted_at IS NULL AND (f.directory_id IS NULL OR d.deleted_at IS NULL)), 0) AS active_storage_bytes,
			COALESCE((SELECT SUM(f.size_bytes) FROM files f LEFT JOIN directories d ON d.id = f.directory_id WHERE f.deleted_at IS NOT NULL OR d.deleted_at IS NOT NULL), 0) AS trash_storage_bytes,
			COALESCE((SELECT SUM(f.chunk_count) FROM files f LEFT JOIN directories d ON d.id = f.directory_id WHERE f.deleted_at IS NULL AND (f.directory_id IS NULL OR d.deleted_at IS NULL)), 0) AS total_chunks,
			COALESCE((SELECT SUM(f.new_chunk_count) FROM files f LEFT JOIN directories d ON d.id = f.directory_id WHERE f.deleted_at IS NULL AND (f.directory_id IS NULL OR d.deleted_at IS NULL)), 0) AS new_chunks,
			COALESCE((SELECT SUM(f.reuse_chunk_count) FROM files f LEFT JOIN directories d ON d.id = f.directory_id WHERE f.deleted_at IS NULL AND (f.directory_id IS NULL OR d.deleted_at IS NULL)), 0) AS reuse_chunks,
			COALESCE((SELECT CASE WHEN SUM(f.chunk_count) > 0 THEN SUM(f.reuse_chunk_count)::float / SUM(f.chunk_count) ELSE 0 END FROM files f LEFT JOIN directories d ON d.id = f.directory_id WHERE f.deleted_at IS NULL AND (f.directory_id IS NULL OR d.deleted_at IS NULL)), 0) AS dedup_ratio,
			(SELECT COUNT(*) FROM activity_logs WHERE created_at >= ? AND action = 'UPLOAD') AS uploads_in_range,
			(SELECT COUNT(*) FROM activity_logs WHERE created_at >= ? AND action = 'DOWNLOAD') AS downloads_in_range,
			(SELECT COUNT(*) FROM activity_logs WHERE created_at >= ? AND action IN ('DELETE_SOFT', 'DELETE_DIRECTORY_SOFT', 'DELETE_FILE_PERMANENT', 'DELETE_DIRECTORY_PERMANENT')) AS deleted_items_in_range,
			(SELECT COUNT(*) FROM activity_logs WHERE created_at >= ? AND action IN ('RESTORE_FILE', 'RESTORE_DIRECTORY')) AS restored_items_in_range,
			(SELECT COUNT(*) FROM activity_logs WHERE created_at >= ? AND action IN ('STAR_FILE', 'UNSTAR_FILE', 'STAR_DIRECTORY', 'UNSTAR_DIRECTORY')) AS starred_actions_in_range`,
		since,
		since,
		since,
		since,
		since,
		since,
	).Scan(&out.Summary).Error; err != nil {
		return domain.AdminAnalytics{}, fmt.Errorf("query admin summary: %w", err)
	}

	if err := r.db.WithContext(ctx).Raw(
		`WITH days AS (
			SELECT generate_series(?::date, CURRENT_DATE, INTERVAL '1 day')::date AS day
		)
		SELECT
			to_char(days.day, 'YYYY-MM-DD') AS date,
			COALESCE(COUNT(*) FILTER (WHERE l.action = 'LOGIN'), 0) AS logins,
			COALESCE(COUNT(*) FILTER (WHERE l.action = 'UPLOAD'), 0) AS uploads,
			COALESCE(COUNT(*) FILTER (WHERE l.action = 'DOWNLOAD'), 0) AS downloads,
			COALESCE(COUNT(*) FILTER (WHERE l.action IN ('DELETE_SOFT', 'DELETE_DIRECTORY_SOFT', 'DELETE_FILE_PERMANENT', 'DELETE_DIRECTORY_PERMANENT')), 0) AS deletes,
			COALESCE(COUNT(*) FILTER (WHERE l.action IN ('RESTORE_FILE', 'RESTORE_DIRECTORY')), 0) AS restores,
			COALESCE(COUNT(*) FILTER (WHERE l.action IN ('STAR_FILE', 'UNSTAR_FILE', 'STAR_DIRECTORY', 'UNSTAR_DIRECTORY')), 0) AS stars
		FROM days
		LEFT JOIN activity_logs l ON l.created_at::date = days.day
		GROUP BY days.day
		ORDER BY days.day`,
		since,
	).Scan(&out.Activity).Error; err != nil {
		return domain.AdminAnalytics{}, fmt.Errorf("query admin activity: %w", err)
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
		WHERE f.deleted_at IS NULL AND (f.directory_id IS NULL OR d.deleted_at IS NULL)
		GROUP BY type
		ORDER BY count DESC, type
		LIMIT 12`,
	).Scan(&out.FileTypes).Error; err != nil {
		return domain.AdminAnalytics{}, fmt.Errorf("query file types: %w", err)
	}

	if err := r.db.WithContext(ctx).Raw(
		`SELECT bucket, COUNT(*) AS count
		FROM (
			SELECT CASE
				WHEN size_bytes < 1048576 THEN '< 1 MB'
				WHEN size_bytes < 10485760 THEN '1-10 MB'
				WHEN size_bytes < 104857600 THEN '10-100 MB'
				WHEN size_bytes < 536870912 THEN '100-512 MB'
				ELSE '> 512 MB'
			END AS bucket
			FROM files f
			LEFT JOIN directories d ON d.id = f.directory_id
			WHERE f.deleted_at IS NULL AND (f.directory_id IS NULL OR d.deleted_at IS NULL)
		) buckets
		GROUP BY bucket
		ORDER BY CASE bucket
			WHEN '< 1 MB' THEN 1
			WHEN '1-10 MB' THEN 2
			WHEN '10-100 MB' THEN 3
			WHEN '100-512 MB' THEN 4
			ELSE 5
		END`,
	).Scan(&out.SizeBuckets).Error; err != nil {
		return domain.AdminAnalytics{}, fmt.Errorf("query file size buckets: %w", err)
	}

	if err := r.db.WithContext(ctx).Raw(
		`SELECT depth, COUNT(*) AS count
		FROM (
			SELECT d.id, COALESCE(MAX(dc.depth), 0) AS depth
			FROM directories d
			JOIN directory_closure dc ON dc.descendant_id = d.id
			WHERE d.deleted_at IS NULL
			GROUP BY d.id
		) directory_depths
		GROUP BY depth
		ORDER BY depth`,
	).Scan(&out.Depths).Error; err != nil {
		return domain.AdminAnalytics{}, fmt.Errorf("query directory depths: %w", err)
	}

	return out, nil
}
