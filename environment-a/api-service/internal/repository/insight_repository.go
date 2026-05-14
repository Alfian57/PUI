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
			(SELECT COUNT(*) FROM files f LEFT JOIN directories d ON d.id_direktori = f.id_direktori WHERE f.id_pengguna = ?::uuid AND f.status_penyimpanan = 'committed' AND f.dihapus_pada IS NULL AND (f.id_direktori IS NULL OR d.dihapus_pada IS NULL)) AS active_files,
			(SELECT COUNT(*) FROM directories WHERE id_pengguna = ?::uuid AND dihapus_pada IS NULL) AS active_folders,
			(SELECT COUNT(*) FROM files f LEFT JOIN directories d ON d.id_direktori = f.id_direktori WHERE f.id_pengguna = ?::uuid AND f.status_penyimpanan = 'committed' AND f.dihapus_pada IS NOT NULL AND (f.id_direktori IS NULL OR d.dihapus_pada IS NULL)) AS trash_files,
			(SELECT COUNT(*) FROM directories d WHERE d.id_pengguna = ?::uuid AND d.dihapus_pada IS NOT NULL AND NOT EXISTS (
				SELECT 1 FROM directory_closure dc JOIN directories a ON a.id_direktori = dc.id_induk
				WHERE dc.id_turunan = d.id_direktori AND dc.kedalaman > 0 AND a.dihapus_pada IS NOT NULL
			)) AS trash_folders,
			(SELECT COUNT(*) FROM files f LEFT JOIN directories d ON d.id_direktori = f.id_direktori WHERE f.id_pengguna = ?::uuid AND f.status_penyimpanan = 'committed' AND f.dihapus_pada IS NULL AND (f.id_direktori IS NULL OR d.dihapus_pada IS NULL) AND f.dibintangi_pada IS NOT NULL) AS starred_files,
			(SELECT COUNT(*) FROM directories WHERE id_pengguna = ?::uuid AND dihapus_pada IS NULL AND dibintang_pada IS NOT NULL) AS starred_folders,
			COALESCE((SELECT SUM(f.ukuran) FROM files f LEFT JOIN directories d ON d.id_direktori = f.id_direktori WHERE f.id_pengguna = ?::uuid AND f.status_penyimpanan = 'committed' AND f.dihapus_pada IS NULL AND (f.id_direktori IS NULL OR d.dihapus_pada IS NULL)), 0) AS active_storage_bytes,
			COALESCE((SELECT SUM(f.ukuran) FROM files f LEFT JOIN directories d ON d.id_direktori = f.id_direktori WHERE f.id_pengguna = ?::uuid AND f.status_penyimpanan = 'committed' AND (f.dihapus_pada IS NOT NULL OR d.dihapus_pada IS NOT NULL)), 0) AS trash_storage_bytes,
			COALESCE((SELECT SUM(f.chunk_count) FROM files f LEFT JOIN directories d ON d.id_direktori = f.id_direktori WHERE f.id_pengguna = ?::uuid AND f.status_penyimpanan = 'committed' AND f.dihapus_pada IS NULL AND (f.id_direktori IS NULL OR d.dihapus_pada IS NULL)), 0) AS total_chunks,
			COALESCE((SELECT SUM(f.new_chunk_count) FROM files f LEFT JOIN directories d ON d.id_direktori = f.id_direktori WHERE f.id_pengguna = ?::uuid AND f.status_penyimpanan = 'committed' AND f.dihapus_pada IS NULL AND (f.id_direktori IS NULL OR d.dihapus_pada IS NULL)), 0) AS new_chunks,
			COALESCE((SELECT SUM(f.reuse_chunk_count) FROM files f LEFT JOIN directories d ON d.id_direktori = f.id_direktori WHERE f.id_pengguna = ?::uuid AND f.status_penyimpanan = 'committed' AND f.dihapus_pada IS NULL AND (f.id_direktori IS NULL OR d.dihapus_pada IS NULL)), 0) AS reuse_chunks,
			COALESCE((SELECT CASE WHEN SUM(f.chunk_count) > 0 THEN SUM(f.reuse_chunk_count)::float / SUM(f.chunk_count) ELSE 0 END FROM files f LEFT JOIN directories d ON d.id_direktori = f.id_direktori WHERE f.id_pengguna = ?::uuid AND f.status_penyimpanan = 'committed' AND f.dihapus_pada IS NULL AND (f.id_direktori IS NULL OR d.dihapus_pada IS NULL)), 0) AS dedup_ratio,
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
			COALESCE(SUM(f.ukuran), 0) AS total_bytes
		FROM files f
		LEFT JOIN directories d ON d.id_direktori = f.id_direktori
		WHERE f.id_pengguna = ?::uuid AND f.status_penyimpanan = 'committed' AND f.dihapus_pada IS NULL AND (f.id_direktori IS NULL OR d.dihapus_pada IS NULL)
		GROUP BY type
		ORDER BY count DESC, type
		LIMIT 8`,
		userID,
	).Scan(&out.FileTypes).Error; err != nil {
		return domain.UserInsight{}, fmt.Errorf("query user insight file types: %w", err)
	}

	if err := r.db.WithContext(ctx).Raw(
		`SELECT f.id_berkas::text AS id, f.nama AS name, f.ukuran AS size_bytes, f.mime_type, f.dibuat_pada AS created_at
		FROM files f
		LEFT JOIN directories d ON d.id_direktori = f.id_direktori
		WHERE f.id_pengguna = ?::uuid AND f.status_penyimpanan = 'committed' AND f.dihapus_pada IS NULL AND (f.id_direktori IS NULL OR d.dihapus_pada IS NULL)
		ORDER BY f.ukuran DESC, f.dibuat_pada DESC
		LIMIT 6`,
		userID,
	).Scan(&out.LargestFiles).Error; err != nil {
		return domain.UserInsight{}, fmt.Errorf("query user insight largest files: %w", err)
	}

	if err := r.db.WithContext(ctx).Raw(
		`SELECT id::text, kind, name, size_bytes, deleted_at
		FROM (
			SELECT f.id_berkas AS id, 'file' AS kind, f.nama AS name, f.ukuran AS size_bytes, f.dihapus_pada AS deleted_at
			FROM files f
			LEFT JOIN directories d ON d.id_direktori = f.id_direktori
			WHERE f.id_pengguna = ?::uuid AND f.status_penyimpanan = 'committed' AND f.dihapus_pada IS NOT NULL AND (f.id_direktori IS NULL OR d.dihapus_pada IS NULL)
			UNION ALL
			SELECT d.id_direktori AS id, 'folder' AS kind, d.nama AS name, 0::bigint AS size_bytes, d.dihapus_pada AS deleted_at
			FROM directories d
			WHERE d.id_pengguna = ?::uuid AND d.dihapus_pada IS NOT NULL AND NOT EXISTS (
				SELECT 1 FROM directory_closure dc JOIN directories a ON a.id_direktori = dc.id_induk
				WHERE dc.id_turunan = d.id_direktori AND dc.kedalaman > 0 AND a.dihapus_pada IS NOT NULL
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
