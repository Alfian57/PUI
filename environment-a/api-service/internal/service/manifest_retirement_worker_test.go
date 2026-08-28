package service

import (
	"context"
	"errors"
	"testing"
)

func TestProcessManifestRetirementRetiresUnreferencedManifest(t *testing.T) {
	queue := &fakeManifestRetirementQueue{}
	vault := &fakeManifestRetirementVault{}

	if err := processManifestRetirement(context.Background(), queue, vault, "manifest-a"); err != nil {
		t.Fatalf("process retirement: %v", err)
	}
	if vault.retired != 1 || vault.retained != 0 {
		t.Fatalf("unexpected vault calls: retired=%d retained=%d", vault.retired, vault.retained)
	}
	if queue.completed != 1 || queue.failed != 0 {
		t.Fatalf("unexpected queue calls: completed=%d failed=%d", queue.completed, queue.failed)
	}
}

func TestProcessManifestRetirementRetainsManifestWhenReferenceReturns(t *testing.T) {
	queue := &fakeManifestRetirementQueue{referenced: true}
	vault := &fakeManifestRetirementVault{}

	if err := processManifestRetirement(context.Background(), queue, vault, "manifest-b"); err != nil {
		t.Fatalf("process retirement: %v", err)
	}
	if vault.retired != 0 || vault.retained != 1 {
		t.Fatalf("unexpected vault calls: retired=%d retained=%d", vault.retired, vault.retained)
	}
	if queue.completed != 1 || queue.failed != 0 {
		t.Fatalf("unexpected queue calls: completed=%d failed=%d", queue.completed, queue.failed)
	}
}

func TestProcessManifestRetirementRetriesVaultFailure(t *testing.T) {
	queue := &fakeManifestRetirementQueue{}
	vaultErr := errors.New("vault unavailable")
	vault := &fakeManifestRetirementVault{retireErr: vaultErr}

	if err := processManifestRetirement(context.Background(), queue, vault, "manifest-c"); !errors.Is(err, vaultErr) {
		t.Fatalf("expected vault error, got %v", err)
	}
	if queue.failed != 1 || queue.completed != 0 {
		t.Fatalf("unexpected queue calls: completed=%d failed=%d", queue.completed, queue.failed)
	}
}

type fakeManifestRetirementQueue struct {
	referenced bool
	completed  int
	failed     int
}

func (f *fakeManifestRetirementQueue) HasManifestReferences(context.Context, string) (bool, error) {
	return f.referenced, nil
}

func (f *fakeManifestRetirementQueue) ClaimPendingManifestRetirements(context.Context, int) ([]string, error) {
	return nil, nil
}

func (f *fakeManifestRetirementQueue) MarkManifestRetirementCompleted(context.Context, string) error {
	f.completed++
	return nil
}

func (f *fakeManifestRetirementQueue) MarkManifestRetirementFailed(context.Context, string, error) error {
	f.failed++
	return nil
}

type fakeManifestRetirementVault struct {
	retired   int
	retained  int
	retireErr error
}

func (f *fakeManifestRetirementVault) RetireManifest(context.Context, string) error {
	f.retired++
	return f.retireErr
}

func (f *fakeManifestRetirementVault) RetainManifest(context.Context, string) error {
	f.retained++
	return nil
}
