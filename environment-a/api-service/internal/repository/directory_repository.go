package repository

import (
	"context"
	"fmt"
	"strings"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"gorm.io/gorm"
)

type DirectoryRepository struct {
	db *gorm.DB
}

func NewDirectoryRepository(db *gorm.DB) *DirectoryRepository {
	return &DirectoryRepository{db: db}
}

func (r *DirectoryRepository) Create(ctx context.Context, userID, name, parentID string) (domain.DirectoryRecord, error) {
	var out domain.DirectoryRecord
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		duplicate, err := r.checkDuplicate(ctx, tx, userID, name, parentID)
		if err != nil {
			return err
		}
		if duplicate {
			return domain.ErrConflict
		}

		err = tx.Raw(
			`INSERT INTO directories (id_pengguna, nama)
			 VALUES (?, ?)
			 RETURNING id_direktori::text AS id, nama AS name, dibuat_pada AS created_at, dihapus_pada AS deleted_at, dibintang_pada AS starred_at`,
			userID,
			name,
		).Scan(&out).Error
		if err != nil {
			return fmt.Errorf("insert directory: %w", err)
		}

		if parentID == "" {
			err = tx.Exec(
				`INSERT INTO directory_closure (id_induk, id_turunan, kedalaman) VALUES (?::uuid, ?::uuid, 0)`,
				out.ID,
				out.ID,
			).Error
			if err != nil {
				return fmt.Errorf("insert root closure: %w", err)
			}

			out.Depth = 0
			return nil
		}

		err = tx.Exec(
			`INSERT INTO directory_closure (id_induk, id_turunan, kedalaman)
			 SELECT id_induk, ?::uuid, kedalaman + 1
			 FROM directory_closure
			 WHERE id_turunan = ?::uuid
			 UNION ALL
			 SELECT ?::uuid, ?::uuid, 0`,
			out.ID,
			parentID,
			out.ID,
			out.ID,
		).Error
		if err != nil {
			return fmt.Errorf("insert child closure: %w", err)
		}

		out.Depth = 0
		parent := strings.TrimSpace(parentID)
		out.ParentID = &parent
		return nil
	})
	if err != nil {
		return domain.DirectoryRecord{}, err
	}

	return out, nil
}

func (r *DirectoryRepository) checkDuplicate(ctx context.Context, tx *gorm.DB, userID, name, parentID string) (bool, error) {
	var duplicate bool

	if strings.TrimSpace(parentID) == "" {
		err := tx.WithContext(ctx).Raw(
			`SELECT EXISTS (
				SELECT 1
				FROM directories d
				WHERE d.id_pengguna = ?
				  AND d.dihapus_pada IS NULL
				  AND lower(d.nama) = lower(?)
				  AND NOT EXISTS (
					SELECT 1 FROM directory_closure dc
					WHERE dc.id_turunan = d.id_direktori AND dc.kedalaman = 1
				  )
			)`,
			userID,
			name,
		).Scan(&duplicate).Error
		if err != nil {
			return false, fmt.Errorf("check root duplicate: %w", err)
		}

		return duplicate, nil
	}

	var parentOwned bool
	err := tx.WithContext(ctx).Raw(
		`SELECT EXISTS (SELECT 1 FROM directories WHERE id_direktori = ? AND id_pengguna = ? AND dihapus_pada IS NULL)`,
		parentID,
		userID,
	).Scan(&parentOwned).Error
	if err != nil {
		return false, fmt.Errorf("check parent ownership: %w", err)
	}
	if !parentOwned {
		return false, domain.ErrNotFound
	}

	err = tx.WithContext(ctx).Raw(
		`SELECT EXISTS (
			SELECT 1
			FROM directory_closure dc
			JOIN directories d ON d.id_direktori = dc.id_turunan
			WHERE dc.id_induk = ?
			  AND dc.kedalaman = 1
			  AND d.id_pengguna = ?
			  AND d.dihapus_pada IS NULL
			  AND lower(d.nama) = lower(?)
		)`,
		parentID,
		userID,
		name,
	).Scan(&duplicate).Error
	if err != nil {
		return false, fmt.Errorf("check child duplicate: %w", err)
	}

	return duplicate, nil
}

func (r *DirectoryRepository) Tree(ctx context.Context, userID, rootID string) ([]domain.DirectoryRecord, error) {
	directories := make([]domain.DirectoryRecord, 0, 64)
	if strings.TrimSpace(rootID) == "" {
		err := r.db.WithContext(ctx).Raw(
			`SELECT d.id_direktori::text AS id, d.nama AS name, 0 AS depth, NULL::text AS parent_id, d.dibuat_pada AS created_at, d.dihapus_pada AS deleted_at, d.dibintang_pada AS starred_at
			 FROM directories d
			 WHERE d.id_pengguna = ?
			   AND d.dihapus_pada IS NULL
			   AND NOT EXISTS (
				SELECT 1 FROM directory_closure dc
				WHERE dc.id_turunan = d.id_direktori AND dc.kedalaman = 1
			   )
			 ORDER BY d.nama`,
			userID,
		).Scan(&directories).Error
		if err != nil {
			return nil, fmt.Errorf("query root directories: %w", err)
		}

		return directories, nil
	}

	err := r.db.WithContext(ctx).Raw(
		`SELECT d.id_direktori::text AS id, d.nama AS name, dc.kedalaman AS depth, parent.id_induk::text AS parent_id, d.dibuat_pada AS created_at, d.dihapus_pada AS deleted_at, d.dibintang_pada AS starred_at
		 FROM directory_closure dc
		 JOIN directories d ON d.id_direktori = dc.id_turunan
		 LEFT JOIN LATERAL (
			SELECT dc2.id_induk
			FROM directory_closure dc2
			WHERE dc2.id_turunan = d.id_direktori AND dc2.kedalaman = 1
			LIMIT 1
		 ) parent ON true
		 WHERE dc.id_induk = ?::uuid
		   AND d.id_pengguna = ?
		   AND d.dihapus_pada IS NULL
		 ORDER BY dc.kedalaman, d.nama`,
		rootID,
		userID,
	).Scan(&directories).Error
	if err != nil {
		return nil, fmt.Errorf("query subtree directories: %w", err)
	}

	return directories, nil
}

func (r *DirectoryRepository) Breadcrumb(ctx context.Context, userID, directoryID string) ([]domain.DirectoryRecord, error) {
	items := make([]domain.DirectoryRecord, 0, 16)
	err := r.db.WithContext(ctx).Raw(
		`SELECT d.id_direktori::text AS id, d.nama AS name, dc.kedalaman AS depth, NULL::text AS parent_id, d.dibuat_pada AS created_at, d.dihapus_pada AS deleted_at, d.dibintang_pada AS starred_at
		 FROM directory_closure dc
		 JOIN directories d ON d.id_direktori = dc.id_induk
		 JOIN directories target ON target.id_direktori = dc.id_turunan
		 WHERE dc.id_turunan = ?::uuid AND target.id_pengguna = ? AND target.dihapus_pada IS NULL AND d.dihapus_pada IS NULL
		 ORDER BY dc.kedalaman DESC`,
		directoryID,
		userID,
	).Scan(&items).Error
	if err != nil {
		return nil, fmt.Errorf("query breadcrumb: %w", err)
	}

	if len(items) == 0 {
		return nil, domain.ErrNotFound
	}

	return items, nil
}

func (r *DirectoryRepository) Detail(ctx context.Context, userID, directoryID string, scope domain.DirectoryDetailScope) (domain.DirectoryDetail, error) {
	targetWhere := `d.dihapus_pada IS NULL AND EXISTS (
			SELECT 1
			FROM directory_closure starred_link
			JOIN directories starred_root ON starred_root.id_direktori = starred_link.id_induk
			WHERE starred_link.id_turunan = d.id_direktori
			  AND starred_root.id_pengguna = d.id_pengguna
			  AND starred_root.dihapus_pada IS NULL
			  AND starred_root.dibintang_pada IS NOT NULL
		)`
	directoryWhere := `d.dihapus_pada IS NULL`
	fileWhere := `f.dihapus_pada IS NULL AND d.dihapus_pada IS NULL`
	if scope == domain.DirectoryDetailScopeTrash {
		targetWhere = `d.dihapus_pada IS NOT NULL`
		directoryWhere = `d.dihapus_pada IS NOT NULL`
		fileWhere = `f.dihapus_pada IS NOT NULL AND d.dihapus_pada IS NOT NULL`
	}
	if scope != domain.DirectoryDetailScopeStarred && scope != domain.DirectoryDetailScopeTrash {
		return domain.DirectoryDetail{}, domain.NewValidationError("scope direktori tidak valid")
	}

	var detail domain.DirectoryDetail
	err := r.db.WithContext(ctx).Raw(
		`SELECT d.id_direktori::text AS id, d.nama AS name, 0 AS depth, parent.id_induk::text AS parent_id, d.dibuat_pada AS created_at, d.dihapus_pada AS deleted_at, d.dibintang_pada AS starred_at
		 FROM directories d
		 LEFT JOIN LATERAL (
			SELECT dc.id_induk
			FROM directory_closure dc
			WHERE dc.id_turunan = d.id_direktori AND dc.kedalaman = 1
			LIMIT 1
		 ) parent ON true
		 WHERE d.id_direktori = ?::uuid
		   AND d.id_pengguna = ?::uuid
		   AND `+targetWhere,
		directoryID,
		userID,
	).Scan(&detail.Directory).Error
	if err != nil {
		return domain.DirectoryDetail{}, fmt.Errorf("query directory detail: %w", err)
	}
	if detail.Directory.ID == "" {
		return domain.DirectoryDetail{}, domain.ErrNotFound
	}

	err = r.db.WithContext(ctx).Raw(
		`WITH subtree AS (
			SELECT id_turunan
			FROM directory_closure
			WHERE id_induk = ?::uuid
		), directory_items AS (
			SELECT d.id_direktori
			FROM directories d
			JOIN subtree s ON s.id_turunan = d.id_direktori
			WHERE d.id_pengguna = ?::uuid
			  AND `+directoryWhere+`
		), file_items AS (
			SELECT f.ukuran
			FROM files f
			JOIN directories d ON d.id_direktori = f.id_direktori
			JOIN subtree s ON s.id_turunan = f.id_direktori
			WHERE f.id_pengguna = ?::uuid
			  AND f.status_penyimpanan = 'committed'
			  AND `+fileWhere+`
		)
		SELECT
			(SELECT COUNT(*) FROM directory_items WHERE id_direktori <> ?::uuid) AS directory_count,
			(SELECT COUNT(*) FROM file_items) AS file_count,
			COALESCE((SELECT SUM(ukuran) FROM file_items), 0) AS total_bytes`,
		directoryID,
		userID,
		userID,
		directoryID,
	).Scan(&detail.Summary).Error
	if err != nil {
		return domain.DirectoryDetail{}, fmt.Errorf("query directory detail summary: %w", err)
	}

	childWhere := `d.dihapus_pada IS NULL`
	if scope == domain.DirectoryDetailScopeTrash {
		childWhere = `d.dihapus_pada IS NOT NULL`
	}
	detail.Directories = make([]domain.DirectoryRecord, 0, 16)
	err = r.db.WithContext(ctx).Raw(
		`SELECT d.id_direktori::text AS id, d.nama AS name, dc.kedalaman AS depth, dc.id_induk::text AS parent_id, d.dibuat_pada AS created_at, d.dihapus_pada AS deleted_at, d.dibintang_pada AS starred_at
		 FROM directory_closure dc
		 JOIN directories d ON d.id_direktori = dc.id_turunan
		 WHERE dc.id_induk = ?::uuid
		   AND dc.kedalaman = 1
		   AND d.id_pengguna = ?::uuid
		   AND `+childWhere+`
		 ORDER BY d.nama, d.id_direktori`,
		directoryID,
		userID,
	).Scan(&detail.Directories).Error
	if err != nil {
		return domain.DirectoryDetail{}, fmt.Errorf("query directory detail children: %w", err)
	}

	return detail, nil
}

func (r *DirectoryRepository) IsOwnedByUser(ctx context.Context, directoryID, userID string) (bool, error) {
	var owned bool
	err := r.db.WithContext(ctx).Raw(
		`SELECT EXISTS (SELECT 1 FROM directories WHERE id_direktori = ?::uuid AND id_pengguna = ?::uuid AND dihapus_pada IS NULL)`,
		directoryID,
		userID,
	).Scan(&owned).Error
	if err != nil {
		return false, fmt.Errorf("check directory ownership: %w", err)
	}

	return owned, nil
}

func (r *DirectoryRepository) IsOwnedByUserIncludingDeleted(ctx context.Context, directoryID, userID string) (bool, error) {
	var owned bool
	err := r.db.WithContext(ctx).Raw(
		`SELECT EXISTS (SELECT 1 FROM directories WHERE id_direktori = ?::uuid AND id_pengguna = ?::uuid)`,
		directoryID,
		userID,
	).Scan(&owned).Error
	if err != nil {
		return false, fmt.Errorf("check directory ownership including deleted: %w", err)
	}

	return owned, nil
}

func (r *DirectoryRepository) SoftDeleteSubtree(ctx context.Context, directoryID, userID string) (domain.DirectoryRecord, error) {
	var out domain.DirectoryRecord
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		err := tx.Raw(
			`SELECT d.id_direktori::text AS id, d.nama AS name, 0 AS depth, parent.id_induk::text AS parent_id, d.dibuat_pada AS created_at, d.dihapus_pada AS deleted_at, d.dibintang_pada AS starred_at
			 FROM directories d
			 LEFT JOIN LATERAL (
				SELECT dc.id_induk
				FROM directory_closure dc
				WHERE dc.id_turunan = d.id_direktori AND dc.kedalaman = 1
				LIMIT 1
			 ) parent ON true
			 WHERE d.id_direktori = ?::uuid AND d.id_pengguna = ?::uuid AND d.dihapus_pada IS NULL`,
			directoryID,
			userID,
		).Scan(&out).Error
		if err != nil {
			return fmt.Errorf("query directory before soft delete: %w", err)
		}
		if out.ID == "" {
			return domain.ErrNotFound
		}

		err = tx.Exec(
			`UPDATE files f
			 SET dihapus_pada = COALESCE(f.dihapus_pada, NOW())
			 WHERE f.id_direktori IN (
				SELECT id_turunan FROM directory_closure WHERE id_induk = ?::uuid
			 )`,
			directoryID,
		).Error
		if err != nil {
			return fmt.Errorf("soft delete subtree files: %w", err)
		}

		err = tx.Exec(
			`UPDATE directories d
			 SET dihapus_pada = COALESCE(d.dihapus_pada, NOW())
			 WHERE d.id_direktori IN (
				SELECT id_turunan FROM directory_closure WHERE id_induk = ?::uuid
			 )
			 AND d.id_pengguna = ?::uuid`,
			directoryID,
			userID,
		).Error
		if err != nil {
			return fmt.Errorf("soft delete subtree directories: %w", err)
		}

		return tx.Raw(
			`SELECT d.id_direktori::text AS id, d.nama AS name, 0 AS depth, parent.id_induk::text AS parent_id, d.dibuat_pada AS created_at, d.dihapus_pada AS deleted_at, d.dibintang_pada AS starred_at
			 FROM directories d
			 LEFT JOIN LATERAL (
				SELECT dc.id_induk
				FROM directory_closure dc
				WHERE dc.id_turunan = d.id_direktori AND dc.kedalaman = 1
				LIMIT 1
			 ) parent ON true
			 WHERE d.id_direktori = ?::uuid AND d.id_pengguna = ?::uuid`,
			directoryID,
			userID,
		).Scan(&out).Error
	})
	if err != nil {
		return domain.DirectoryRecord{}, err
	}

	return out, nil
}

func (r *DirectoryRepository) RestoreSubtree(ctx context.Context, directoryID, userID string) (domain.DirectoryRecord, error) {
	var out domain.DirectoryRecord
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var owned bool
		if err := tx.Raw(
			`SELECT EXISTS (
				SELECT 1 FROM directories
				WHERE id_direktori = ?::uuid AND id_pengguna = ?::uuid AND dihapus_pada IS NOT NULL
			)`,
			directoryID,
			userID,
		).Scan(&owned).Error; err != nil {
			return fmt.Errorf("check deleted directory ownership: %w", err)
		}
		if !owned {
			return domain.ErrNotFound
		}

		err := tx.Exec(
			`UPDATE directories d
			 SET dihapus_pada = NULL
			 WHERE d.id_direktori IN (
				SELECT id_turunan FROM directory_closure WHERE id_induk = ?::uuid
			 )
			 AND d.id_pengguna = ?::uuid`,
			directoryID,
			userID,
		).Error
		if err != nil {
			return fmt.Errorf("restore subtree directories: %w", err)
		}

		err = tx.Exec(
			`UPDATE files f
			 SET dihapus_pada = NULL
			 WHERE f.id_direktori IN (
				SELECT id_turunan FROM directory_closure WHERE id_induk = ?::uuid
			 )
			 AND EXISTS (
				SELECT 1
				FROM directories d
				WHERE d.id_direktori = f.id_direktori AND d.id_pengguna = ?::uuid
			 )`,
			directoryID,
			userID,
		).Error
		if err != nil {
			return fmt.Errorf("restore subtree files: %w", err)
		}

		return tx.Raw(
			`SELECT d.id_direktori::text AS id, d.nama AS name, 0 AS depth, parent.id_induk::text AS parent_id, d.dibuat_pada AS created_at, d.dihapus_pada AS deleted_at, d.dibintang_pada AS starred_at
			 FROM directories d
			 LEFT JOIN LATERAL (
				SELECT dc.id_induk
				FROM directory_closure dc
				WHERE dc.id_turunan = d.id_direktori AND dc.kedalaman = 1
				LIMIT 1
			 ) parent ON true
			 WHERE d.id_direktori = ?::uuid AND d.id_pengguna = ?::uuid`,
			directoryID,
			userID,
		).Scan(&out).Error
	})
	if err != nil {
		return domain.DirectoryRecord{}, err
	}
	if out.ID == "" {
		return domain.DirectoryRecord{}, domain.ErrNotFound
	}

	return out, nil
}

func (r *DirectoryRepository) PermanentDeleteSubtree(ctx context.Context, directoryID, userID string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var owned bool
		err := tx.Raw(`SELECT EXISTS (SELECT 1 FROM directories WHERE id_direktori = ?::uuid AND id_pengguna = ?::uuid AND dihapus_pada IS NOT NULL)`, directoryID, userID).Scan(&owned).Error
		if err != nil {
			return fmt.Errorf("check deleted directory ownership: %w", err)
		}
		if !owned {
			return domain.ErrNotFound
		}

		subtreeIDs := make([]string, 0, 16)
		if err := tx.Raw(`SELECT id_turunan::text FROM directory_closure WHERE id_induk = ?::uuid`, directoryID).Scan(&subtreeIDs).Error; err != nil {
			return fmt.Errorf("query subtree ids: %w", err)
		}
		if len(subtreeIDs) == 0 {
			return domain.ErrNotFound
		}

		var manifestRows []manifestIDRow
		if err := tx.Raw(
			`SELECT COALESCE(id_manifest, '') AS manifest_id
			 FROM files
			 WHERE id_direktori IN ? AND status_penyimpanan = 'committed'
			 FOR UPDATE`,
			subtreeIDs,
		).Scan(&manifestRows).Error; err != nil {
			return fmt.Errorf("find subtree manifests for retirement: %w", err)
		}

		manifestIDs := make([]string, 0, len(manifestRows))
		for _, row := range manifestRows {
			if strings.TrimSpace(row.ManifestID) != "" {
				manifestIDs = append(manifestIDs, row.ManifestID)
			}
		}
		if err := lockManifestLifecycles(ctx, tx, manifestIDs); err != nil {
			return err
		}

		if err := tx.Exec(`DELETE FROM files WHERE id_direktori IN ?`, subtreeIDs).Error; err != nil {
			return fmt.Errorf("permanent delete subtree files: %w", err)
		}
		if err := queueManifestRetirements(ctx, tx, manifestIDs); err != nil {
			return err
		}
		if err := tx.Exec(`DELETE FROM directory_closure WHERE id_induk IN ? OR id_turunan IN ?`, subtreeIDs, subtreeIDs).Error; err != nil {
			return fmt.Errorf("permanent delete closure: %w", err)
		}
		if err := tx.Exec(`DELETE FROM directories WHERE id_direktori IN ? AND id_pengguna = ?::uuid`, subtreeIDs, userID).Error; err != nil {
			return fmt.Errorf("permanent delete directories: %w", err)
		}

		return nil
	})
}

func (r *DirectoryRepository) SetStarred(ctx context.Context, directoryID, userID string, starred bool) (domain.DirectoryRecord, error) {
	var out domain.DirectoryRecord
	value := "NOW()"
	if !starred {
		value = "NULL"
	}
	err := r.db.WithContext(ctx).Raw(
		fmt.Sprintf(
			`UPDATE directories
			 SET dibintang_pada = %s
			 WHERE id_direktori = ?::uuid AND id_pengguna = ?::uuid AND dihapus_pada IS NULL
			 RETURNING id_direktori::text AS id, nama AS name, 0 AS depth, NULL::text AS parent_id, dibuat_pada AS created_at, dihapus_pada AS deleted_at, dibintang_pada AS starred_at`,
			value,
		),
		directoryID,
		userID,
	).Scan(&out).Error
	if err != nil {
		return domain.DirectoryRecord{}, fmt.Errorf("set directory starred: %w", err)
	}
	if out.ID == "" {
		return domain.DirectoryRecord{}, domain.ErrNotFound
	}

	return out, nil
}

func (r *DirectoryRepository) ListTrashRoots(ctx context.Context, userID string) ([]domain.DirectoryRecord, error) {
	items := make([]domain.DirectoryRecord, 0, 16)
	err := r.db.WithContext(ctx).Raw(
		`SELECT d.id_direktori::text AS id, d.nama AS name, 0 AS depth, parent.id_induk::text AS parent_id, d.dibuat_pada AS created_at, d.dihapus_pada AS deleted_at, d.dibintang_pada AS starred_at
		 FROM directories d
		 LEFT JOIN LATERAL (
			SELECT dc.id_induk
			FROM directory_closure dc
			WHERE dc.id_turunan = d.id_direktori AND dc.kedalaman = 1
			LIMIT 1
		 ) parent ON true
		 WHERE d.id_pengguna = ?::uuid
		   AND d.dihapus_pada IS NOT NULL
		   AND NOT EXISTS (
			SELECT 1
			FROM directory_closure dc
			JOIN directories a ON a.id_direktori = dc.id_induk
			WHERE dc.id_turunan = d.id_direktori
			  AND dc.kedalaman > 0
			  AND a.dihapus_pada IS NOT NULL
		   )
		 ORDER BY d.dihapus_pada DESC, d.nama`,
		userID,
	).Scan(&items).Error
	if err != nil {
		return nil, fmt.Errorf("query trash directories: %w", err)
	}

	return items, nil
}

func (r *DirectoryRepository) ListStarred(ctx context.Context, userID string) ([]domain.DirectoryRecord, error) {
	items := make([]domain.DirectoryRecord, 0, 16)
	err := r.db.WithContext(ctx).Raw(
		`SELECT d.id_direktori::text AS id, d.nama AS name, 0 AS depth, parent.id_induk::text AS parent_id, d.dibuat_pada AS created_at, d.dihapus_pada AS deleted_at, d.dibintang_pada AS starred_at
		 FROM directories d
		 LEFT JOIN LATERAL (
			SELECT dc.id_induk
			FROM directory_closure dc
			WHERE dc.id_turunan = d.id_direktori AND dc.kedalaman = 1
			LIMIT 1
		 ) parent ON true
		 WHERE d.id_pengguna = ?::uuid
		   AND d.dihapus_pada IS NULL
		   AND d.dibintang_pada IS NOT NULL
		 ORDER BY d.dibintang_pada DESC, d.nama`,
		userID,
	).Scan(&items).Error
	if err != nil {
		return nil, fmt.Errorf("query starred directories: %w", err)
	}

	return items, nil
}

func (r *DirectoryRepository) ListTrashRootsPage(ctx context.Context, userID string, limit, offset int) ([]domain.DirectoryRecord, int64, error) {
	return r.listWorkspaceDirectoriesPage(ctx, userID, "trash", limit, offset)
}

func (r *DirectoryRepository) ListStarredPage(ctx context.Context, userID string, limit, offset int) ([]domain.DirectoryRecord, int64, error) {
	return r.listWorkspaceDirectoriesPage(ctx, userID, "starred", limit, offset)
}

func (r *DirectoryRepository) listWorkspaceDirectoriesPage(ctx context.Context, userID, mode string, limit, offset int) ([]domain.DirectoryRecord, int64, error) {
	where := ` WHERE d.id_pengguna = ?::uuid`
	args := []any{userID}
	orderBy := "lower(d.nama) ASC, d.id_direktori ASC"
	if mode == "trash" {
		where += ` AND d.dihapus_pada IS NOT NULL
			AND NOT EXISTS (
				SELECT 1
				FROM directory_closure dc
				JOIN directories a ON a.id_direktori = dc.id_induk
				WHERE dc.id_turunan = d.id_direktori
				  AND dc.kedalaman > 0
				  AND a.dihapus_pada IS NOT NULL
			)`
		orderBy = "d.dihapus_pada DESC, lower(d.nama) ASC, d.id_direktori ASC"
	} else {
		where += ` AND d.dihapus_pada IS NULL AND d.dibintang_pada IS NOT NULL`
		orderBy = "d.dibintang_pada DESC, lower(d.nama) ASC, d.id_direktori ASC"
	}

	var total int64
	countQuery := `SELECT COUNT(*) FROM directories d` + where
	if err := r.db.WithContext(ctx).Raw(countQuery, args...).Scan(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count %s directories: %w", mode, err)
	}

	listQuery := `SELECT d.id_direktori::text AS id, d.nama AS name, 0 AS depth, parent.id_induk::text AS parent_id, d.dibuat_pada AS created_at, d.dihapus_pada AS deleted_at, d.dibintang_pada AS starred_at
		FROM directories d
		LEFT JOIN LATERAL (
			SELECT dc.id_induk
			FROM directory_closure dc
			WHERE dc.id_turunan = d.id_direktori AND dc.kedalaman = 1
			LIMIT 1
		) parent ON true` + where + ` ORDER BY ` + orderBy + ` LIMIT ? OFFSET ?`
	listArgs := append(append([]any{}, args...), limit, offset)
	items := make([]domain.DirectoryRecord, 0, limit)
	if err := r.db.WithContext(ctx).Raw(listQuery, listArgs...).Scan(&items).Error; err != nil {
		return nil, 0, fmt.Errorf("query %s directories page: %w", mode, err)
	}

	return items, total, nil
}
