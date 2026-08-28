package service

import (
	"context"
	"log"
	"time"
)

const (
	manifestRetirementBatchSize = 16
	manifestRetirementInterval  = 15 * time.Second
)

type ManifestRetirementQueue interface {
	HasManifestReferences(ctx context.Context, manifestID string) (bool, error)
	ClaimPendingManifestRetirements(ctx context.Context, limit int) ([]string, error)
	MarkManifestRetirementCompleted(ctx context.Context, manifestID string) error
	MarkManifestRetirementFailed(ctx context.Context, manifestID string, cause error) error
}

type ManifestRetirementVault interface {
	RetireManifest(ctx context.Context, manifestID string) error
	RetainManifest(ctx context.Context, manifestID string) error
}

// RunManifestRetirementWorker drains the durable API outbox. It is safe to
// run multiple workers: database claims use SKIP LOCKED and Vault retirement
// is idempotent. A failed item remains pending with a retry delay.
func RunManifestRetirementWorker(ctx context.Context, queue ManifestRetirementQueue, vault ManifestRetirementVault) {
	process := func() {
		manifestIDs, err := queue.ClaimPendingManifestRetirements(ctx, manifestRetirementBatchSize)
		if err != nil {
			if ctx.Err() == nil {
				log.Printf("event=manifest_retirement_claim_failed err=%v", err)
			}
			return
		}

		for _, manifestID := range manifestIDs {
			if err := processManifestRetirement(ctx, queue, vault, manifestID); err != nil {
				log.Printf("event=manifest_retirement_failed manifest_id=%s err=%v", manifestID, err)
			}
		}
	}

	process()
	ticker := time.NewTicker(manifestRetirementInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			process()
		case <-ctx.Done():
			return
		}
	}
}

func processManifestRetirement(ctx context.Context, queue ManifestRetirementQueue, vault ManifestRetirementVault, manifestID string) error {
	referenced, err := queue.HasManifestReferences(ctx, manifestID)
	if err != nil {
		_ = queue.MarkManifestRetirementFailed(ctx, manifestID, err)
		return err
	}
	if referenced {
		// A soft-deleted file may have been restored, or a new reference may
		// have committed while the outbox item was waiting. Cancel retirement.
		if err := vault.RetainManifest(ctx, manifestID); err != nil {
			_ = queue.MarkManifestRetirementFailed(ctx, manifestID, err)
			return err
		}
		return queue.MarkManifestRetirementCompleted(ctx, manifestID)
	}

	if err := vault.RetireManifest(ctx, manifestID); err != nil {
		_ = queue.MarkManifestRetirementFailed(ctx, manifestID, err)
		return err
	}

	// Close the small cross-store window between the first reference check and
	// Vault retirement. MarkCommitted requeues the item, so a new reference is
	// retained before this request is considered complete.
	referenced, err = queue.HasManifestReferences(ctx, manifestID)
	if err != nil {
		_ = queue.MarkManifestRetirementFailed(ctx, manifestID, err)
		return err
	}
	if referenced {
		if err := vault.RetainManifest(ctx, manifestID); err != nil {
			_ = queue.MarkManifestRetirementFailed(ctx, manifestID, err)
			return err
		}
	}

	if err := queue.MarkManifestRetirementCompleted(ctx, manifestID); err != nil {
		return err
	}
	return nil
}
