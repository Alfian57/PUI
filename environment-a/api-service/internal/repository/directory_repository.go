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
			 RETURNING id::text, name, created_at`,
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
		`SELECT EXISTS (SELECT 1 FROM directories WHERE id = ? AND user_id = ?)`,
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
			`SELECT d.id::text, d.name, 0 AS depth, NULL::text AS parent_id, d.created_at
			 FROM directories d
			 WHERE d.user_id = ?
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
		`SELECT d.id::text, d.name, dc.depth, parent.ancestor_id::text AS parent_id, d.created_at
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
		`SELECT d.id::text, d.name, dc.depth, NULL::text AS parent_id, d.created_at
		 FROM directory_closure dc
		 JOIN directories d ON d.id = dc.ancestor_id
		 JOIN directories target ON target.id = dc.descendant_id
		 WHERE dc.descendant_id = ?::uuid AND target.user_id = ?
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
		`SELECT EXISTS (SELECT 1 FROM directories WHERE id = ?::uuid AND user_id = ?::uuid)`,
		directoryID,
		userID,
	).Scan(&owned).Error
	if err != nil {
		return false, fmt.Errorf("check directory ownership: %w", err)
	}

	return owned, nil
}
