package repository

import (
	"context"
	"fmt"
	"sort"
	"strings"

	"gorm.io/gorm"
)

type manifestIDRow struct {
	ManifestID string `gorm:"column:manifest_id"`
}

// queueManifestRetirements records a durable intent only when no committed
// application metadata still references the manifest. The caller must invoke
// this inside the same transaction that removes the metadata rows.
func queueManifestRetirements(ctx context.Context, tx *gorm.DB, manifestIDs []string) error {
	uniqueIDs := make(map[string]struct{}, len(manifestIDs))
	for _, manifestID := range manifestIDs {
		manifestID = strings.TrimSpace(manifestID)
		if manifestID != "" {
			uniqueIDs[manifestID] = struct{}{}
		}
	}

	orderedIDs := sortedManifestIDs(uniqueIDs)
	if err := lockManifestLifecycles(ctx, tx, orderedIDs); err != nil {
		return err
	}

	for _, manifestID := range orderedIDs {
		var referenced bool
		if err := tx.WithContext(ctx).Raw(
			`SELECT EXISTS (
				SELECT 1 FROM files
				WHERE id_manifest = ?
				  AND status_penyimpanan = 'committed'
			)`,
			manifestID,
		).Scan(&referenced).Error; err != nil {
			return fmt.Errorf("check manifest references %s: %w", manifestID, err)
		}
		if referenced {
			continue
		}

		if err := tx.WithContext(ctx).Exec(
			`INSERT INTO manifest_retirement_requests
				(manifest_id, status, attempts, available_at, last_error, completed_at)
			 VALUES (?, 'pending', 0, NOW(), '', NULL)
			 ON CONFLICT (manifest_id) DO UPDATE SET
				status = 'pending',
				attempts = 0,
				available_at = NOW(),
				last_error = '',
				completed_at = NULL`,
			manifestID,
		).Error; err != nil {
			return fmt.Errorf("queue manifest retirement %s: %w", manifestID, err)
		}
	}

	return nil
}

func sortedManifestIDs(uniqueIDs map[string]struct{}) []string {
	orderedIDs := make([]string, 0, len(uniqueIDs))
	for manifestID := range uniqueIDs {
		orderedIDs = append(orderedIDs, manifestID)
	}
	sort.Strings(orderedIDs)
	return orderedIDs
}

func lockManifestLifecycles(ctx context.Context, tx *gorm.DB, manifestIDs []string) error {
	uniqueIDs := make(map[string]struct{}, len(manifestIDs))
	for _, manifestID := range manifestIDs {
		manifestID = strings.TrimSpace(manifestID)
		if manifestID != "" {
			uniqueIDs[manifestID] = struct{}{}
		}
	}
	for _, manifestID := range sortedManifestIDs(uniqueIDs) {
		if err := lockManifestLifecycle(ctx, tx, manifestID); err != nil {
			return err
		}
	}
	return nil
}

func lockManifestLifecycle(ctx context.Context, tx *gorm.DB, manifestID string) error {
	if strings.TrimSpace(manifestID) == "" {
		return nil
	}

	if err := tx.WithContext(ctx).Exec(
		`SELECT pg_advisory_xact_lock(hashtextextended(?, 0))`,
		manifestID,
	).Error; err != nil {
		return fmt.Errorf("lock manifest lifecycle %s: %w", manifestID, err)
	}
	return nil
}

func (r *FileRepository) HasManifestReferences(ctx context.Context, manifestID string) (bool, error) {
	var referenced bool
	err := r.db.WithContext(ctx).Raw(
		`SELECT EXISTS (
			SELECT 1 FROM files
			WHERE id_manifest = ?
			  AND status_penyimpanan = 'committed'
		)`,
		manifestID,
	).Scan(&referenced).Error
	if err != nil {
		return false, fmt.Errorf("check manifest references: %w", err)
	}

	return referenced, nil
}

// RequeueManifestRetirement closes the race where a new upload commits an
// application reference while an older retirement request is being drained.
// The worker will observe the reference and call Vault retain before marking
// the request complete.
func (r *FileRepository) RequeueManifestRetirement(ctx context.Context, manifestID string) error {
	manifestID = strings.TrimSpace(manifestID)
	if manifestID == "" {
		return nil
	}

	result := r.db.WithContext(ctx).Exec(
		`UPDATE manifest_retirement_requests
		 SET status = 'pending',
		     available_at = NOW(),
		     last_error = '',
		     completed_at = NULL
		 WHERE manifest_id = ?`,
		manifestID,
	)
	if result.Error != nil {
		return fmt.Errorf("requeue manifest retirement %s: %w", manifestID, result.Error)
	}
	return nil
}

func (r *FileRepository) ClaimPendingManifestRetirements(ctx context.Context, limit int) ([]string, error) {
	if limit <= 0 {
		limit = 16
	}
	if limit > 100 {
		limit = 100
	}

	claimed := make([]manifestIDRow, 0, limit)
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Raw(
			`SELECT manifest_id
			 FROM manifest_retirement_requests
			 WHERE status = 'pending' AND available_at <= NOW()
			 ORDER BY available_at, manifest_id
			 LIMIT ?
			 FOR UPDATE SKIP LOCKED`,
			limit,
		).Scan(&claimed).Error; err != nil {
			return fmt.Errorf("claim manifest retirements: %w", err)
		}

		for _, item := range claimed {
			if err := tx.Exec(
				`UPDATE manifest_retirement_requests
				 SET attempts = attempts + 1,
				     available_at = NOW() + INTERVAL '1 minute'
				 WHERE manifest_id = ? AND status = 'pending'`,
				item.ManifestID,
			).Error; err != nil {
				return fmt.Errorf("mark manifest retirement claimed %s: %w", item.ManifestID, err)
			}
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	manifestIDs := make([]string, 0, len(claimed))
	for _, item := range claimed {
		manifestIDs = append(manifestIDs, item.ManifestID)
	}
	return manifestIDs, nil
}

func (r *FileRepository) MarkManifestRetirementCompleted(ctx context.Context, manifestID string) error {
	result := r.db.WithContext(ctx).Exec(
		`UPDATE manifest_retirement_requests
		 SET status = 'completed', completed_at = NOW(), last_error = ''
		 WHERE manifest_id = ?`,
		manifestID,
	)
	if result.Error != nil {
		return fmt.Errorf("complete manifest retirement %s: %w", manifestID, result.Error)
	}
	return nil
}

func (r *FileRepository) MarkManifestRetirementFailed(ctx context.Context, manifestID string, cause error) error {
	message := "manifest retirement failed"
	if cause != nil {
		message = cause.Error()
	}
	if len(message) > 2000 {
		message = message[:2000]
	}

	result := r.db.WithContext(ctx).Exec(
		`UPDATE manifest_retirement_requests
		 SET status = 'pending',
		     available_at = NOW() + INTERVAL '1 minute',
		     last_error = ?,
		     completed_at = NULL
		 WHERE manifest_id = ?`,
		message,
		manifestID,
	)
	if result.Error != nil {
		return fmt.Errorf("retry manifest retirement %s: %w", manifestID, result.Error)
	}
	return nil
}
