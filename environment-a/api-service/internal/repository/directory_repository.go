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
			`INSERT INTO directories (user_id, name)
			 VALUES (?, ?)
			 RETURNING id::text, name, created_at, deleted_at, starred_at`,
			userID,
			name,
		).Scan(&out).Error
		if err != nil {
			return fmt.Errorf("insert directory: %w", err)
		}

		if parentID == "" {
			err = tx.Exec(
				`INSERT INTO directory_closure (ancestor_id, descendant_id, depth) VALUES (?::uuid, ?::uuid, 0)`,
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
			`INSERT INTO directory_closure (ancestor_id, descendant_id, depth)
			 SELECT ancestor_id, ?::uuid, depth + 1
			 FROM directory_closure
			 WHERE descendant_id = ?::uuid
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
				WHERE d.user_id = ?
				  AND d.deleted_at IS NULL
				  AND lower(d.name) = lower(?)
				  AND NOT EXISTS (
					SELECT 1 FROM directory_closure dc
					WHERE dc.descendant_id = d.id AND dc.depth = 1
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
		`SELECT EXISTS (SELECT 1 FROM directories WHERE id = ? AND user_id = ? AND deleted_at IS NULL)`,
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
			JOIN directories d ON d.id = dc.descendant_id
			WHERE dc.ancestor_id = ?
			  AND dc.depth = 1
			  AND d.user_id = ?
			  AND d.deleted_at IS NULL
			  AND lower(d.name) = lower(?)
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
			`SELECT d.id::text, d.name, 0 AS depth, NULL::text AS parent_id, d.created_at, d.deleted_at, d.starred_at
			 FROM directories d
			 WHERE d.user_id = ?
			   AND d.deleted_at IS NULL
			   AND NOT EXISTS (
				SELECT 1 FROM directory_closure dc
				WHERE dc.descendant_id = d.id AND dc.depth = 1
			   )
			 ORDER BY d.name`,
			userID,
		).Scan(&directories).Error
		if err != nil {
			return nil, fmt.Errorf("query root directories: %w", err)
		}

		return directories, nil
	}

	err := r.db.WithContext(ctx).Raw(
		`SELECT d.id::text, d.name, dc.depth, parent.ancestor_id::text AS parent_id, d.created_at, d.deleted_at, d.starred_at
		 FROM directory_closure dc
		 JOIN directories d ON d.id = dc.descendant_id
		 LEFT JOIN LATERAL (
			SELECT dc2.ancestor_id
			FROM directory_closure dc2
			WHERE dc2.descendant_id = d.id AND dc2.depth = 1
			LIMIT 1
		 ) parent ON true
		 WHERE dc.ancestor_id = ?::uuid
		   AND d.user_id = ?
		   AND d.deleted_at IS NULL
		 ORDER BY dc.depth, d.name`,
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
		`SELECT d.id::text, d.name, dc.depth, NULL::text AS parent_id, d.created_at, d.deleted_at, d.starred_at
		 FROM directory_closure dc
		 JOIN directories d ON d.id = dc.ancestor_id
		 JOIN directories target ON target.id = dc.descendant_id
		 WHERE dc.descendant_id = ?::uuid AND target.user_id = ? AND target.deleted_at IS NULL AND d.deleted_at IS NULL
		 ORDER BY dc.depth DESC`,
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

func (r *DirectoryRepository) IsOwnedByUser(ctx context.Context, directoryID, userID string) (bool, error) {
	var owned bool
	err := r.db.WithContext(ctx).Raw(
		`SELECT EXISTS (SELECT 1 FROM directories WHERE id = ?::uuid AND user_id = ?::uuid AND deleted_at IS NULL)`,
		directoryID,
		userID,
	).Scan(&owned).Error
	if err != nil {
		return false, fmt.Errorf("check directory ownership: %w", err)
	}

	return owned, nil
}

func (r *DirectoryRepository) SoftDeleteSubtree(ctx context.Context, directoryID, userID string) (domain.DirectoryRecord, error) {
	var out domain.DirectoryRecord
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		err := tx.Raw(
			`SELECT d.id::text, d.name, 0 AS depth, parent.ancestor_id::text AS parent_id, d.created_at, d.deleted_at, d.starred_at
			 FROM directories d
			 LEFT JOIN LATERAL (
				SELECT dc.ancestor_id
				FROM directory_closure dc
				WHERE dc.descendant_id = d.id AND dc.depth = 1
				LIMIT 1
			 ) parent ON true
			 WHERE d.id = ?::uuid AND d.user_id = ?::uuid AND d.deleted_at IS NULL`,
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
			 SET deleted_at = COALESCE(f.deleted_at, NOW())
			 WHERE f.directory_id IN (
				SELECT descendant_id FROM directory_closure WHERE ancestor_id = ?::uuid
			 )`,
			directoryID,
		).Error
		if err != nil {
			return fmt.Errorf("soft delete subtree files: %w", err)
		}

		err = tx.Exec(
			`UPDATE directories d
			 SET deleted_at = COALESCE(d.deleted_at, NOW())
			 WHERE d.id IN (
				SELECT descendant_id FROM directory_closure WHERE ancestor_id = ?::uuid
			 )
			 AND d.user_id = ?::uuid`,
			directoryID,
			userID,
		).Error
		if err != nil {
			return fmt.Errorf("soft delete subtree directories: %w", err)
		}

		return tx.Raw(
			`SELECT d.id::text, d.name, 0 AS depth, parent.ancestor_id::text AS parent_id, d.created_at, d.deleted_at, d.starred_at
			 FROM directories d
			 LEFT JOIN LATERAL (
				SELECT dc.ancestor_id
				FROM directory_closure dc
				WHERE dc.descendant_id = d.id AND dc.depth = 1
				LIMIT 1
			 ) parent ON true
			 WHERE d.id = ?::uuid AND d.user_id = ?::uuid`,
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
				WHERE id = ?::uuid AND user_id = ?::uuid AND deleted_at IS NOT NULL
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
			 SET deleted_at = NULL
			 WHERE d.id IN (
				SELECT descendant_id FROM directory_closure WHERE ancestor_id = ?::uuid
			 )
			 AND d.user_id = ?::uuid`,
			directoryID,
			userID,
		).Error
		if err != nil {
			return fmt.Errorf("restore subtree directories: %w", err)
		}

		err = tx.Exec(
			`UPDATE files f
			 SET deleted_at = NULL
			 WHERE f.directory_id IN (
				SELECT descendant_id FROM directory_closure WHERE ancestor_id = ?::uuid
			 )
			 AND EXISTS (
				SELECT 1
				FROM directories d
				WHERE d.id = f.directory_id AND d.user_id = ?::uuid
			 )`,
			directoryID,
			userID,
		).Error
		if err != nil {
			return fmt.Errorf("restore subtree files: %w", err)
		}

		return tx.Raw(
			`SELECT d.id::text, d.name, 0 AS depth, parent.ancestor_id::text AS parent_id, d.created_at, d.deleted_at, d.starred_at
			 FROM directories d
			 LEFT JOIN LATERAL (
				SELECT dc.ancestor_id
				FROM directory_closure dc
				WHERE dc.descendant_id = d.id AND dc.depth = 1
				LIMIT 1
			 ) parent ON true
			 WHERE d.id = ?::uuid AND d.user_id = ?::uuid`,
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
		err := tx.Raw(`SELECT EXISTS (SELECT 1 FROM directories WHERE id = ?::uuid AND user_id = ?::uuid AND deleted_at IS NOT NULL)`, directoryID, userID).Scan(&owned).Error
		if err != nil {
			return fmt.Errorf("check deleted directory ownership: %w", err)
		}
		if !owned {
			return domain.ErrNotFound
		}

		subtreeIDs := make([]string, 0, 16)
		if err := tx.Raw(`SELECT descendant_id::text FROM directory_closure WHERE ancestor_id = ?::uuid`, directoryID).Scan(&subtreeIDs).Error; err != nil {
			return fmt.Errorf("query subtree ids: %w", err)
		}
		if len(subtreeIDs) == 0 {
			return domain.ErrNotFound
		}

		if err := tx.Exec(`DELETE FROM files WHERE directory_id IN ?`, subtreeIDs).Error; err != nil {
			return fmt.Errorf("permanent delete subtree files: %w", err)
		}
		if err := tx.Exec(`DELETE FROM directory_closure WHERE ancestor_id IN ? OR descendant_id IN ?`, subtreeIDs, subtreeIDs).Error; err != nil {
			return fmt.Errorf("permanent delete closure: %w", err)
		}
		if err := tx.Exec(`DELETE FROM directories WHERE id IN ? AND user_id = ?::uuid`, subtreeIDs, userID).Error; err != nil {
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
			 SET starred_at = %s
			 WHERE id = ?::uuid AND user_id = ?::uuid AND deleted_at IS NULL
			 RETURNING id::text, name, 0 AS depth, NULL::text AS parent_id, created_at, deleted_at, starred_at`,
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
		`SELECT d.id::text, d.name, 0 AS depth, parent.ancestor_id::text AS parent_id, d.created_at, d.deleted_at, d.starred_at
		 FROM directories d
		 LEFT JOIN LATERAL (
			SELECT dc.ancestor_id
			FROM directory_closure dc
			WHERE dc.descendant_id = d.id AND dc.depth = 1
			LIMIT 1
		 ) parent ON true
		 WHERE d.user_id = ?::uuid
		   AND d.deleted_at IS NOT NULL
		   AND NOT EXISTS (
			SELECT 1
			FROM directory_closure dc
			JOIN directories a ON a.id = dc.ancestor_id
			WHERE dc.descendant_id = d.id
			  AND dc.depth > 0
			  AND a.deleted_at IS NOT NULL
		   )
		 ORDER BY d.deleted_at DESC, d.name`,
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
		`SELECT d.id::text, d.name, 0 AS depth, parent.ancestor_id::text AS parent_id, d.created_at, d.deleted_at, d.starred_at
		 FROM directories d
		 LEFT JOIN LATERAL (
			SELECT dc.ancestor_id
			FROM directory_closure dc
			WHERE dc.descendant_id = d.id AND dc.depth = 1
			LIMIT 1
		 ) parent ON true
		 WHERE d.user_id = ?::uuid
		   AND d.deleted_at IS NULL
		   AND d.starred_at IS NOT NULL
		 ORDER BY d.starred_at DESC, d.name`,
		userID,
	).Scan(&items).Error
	if err != nil {
		return nil, fmt.Errorf("query starred directories: %w", err)
	}

	return items, nil
}
