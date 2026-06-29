package service

import (
	"bytes"
	"context"
	"errors"
	"io"
	"testing"
	"time"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"github.com/alfiang/pui/environment-a/api-service/internal/vaultclient"
)

// fakeSecurityFiles emulates the application layer: it stores one demo file,
// lets it be uploaded, soft-deleted, and permanently deleted. After permanent
// deletion, Detail returns not-found — mirroring the real FileService.
type fakeSecurityFiles struct {
	content    []byte
	manifestID string
	fileID     string
	deleted    bool
}

func (f *fakeSecurityFiles) Upload(_ context.Context, _ domain.AuthUser, _, fileName, _ string, reader io.Reader) (UploadOutcome, error) {
	data, _ := io.ReadAll(reader)
	f.content = data
	f.fileID = "file-123"
	f.manifestID = "manifest-abc"
	return UploadOutcome{
		File: domain.FileRecord{ID: f.fileID, Name: fileName, ManifestID: f.manifestID, SizeBytes: int64(len(data))},
		UploadCommitResult: vaultclient.UploadCommitResult{
			ManifestID: f.manifestID,
			FileHash:   "filehash-xyz",
			ChunkCount: 2,
			Immutable:  true,
		},
	}, nil
}

func (f *fakeSecurityFiles) Detail(_ context.Context, _ domain.AuthUser, _ string, _ bool) (domain.FileRecord, error) {
	if f.deleted {
		return domain.FileRecord{}, domain.ErrNotFound
	}
	return domain.FileRecord{ID: f.fileID, ManifestID: f.manifestID}, nil
}

func (f *fakeSecurityFiles) SoftDelete(_ context.Context, _ domain.AuthUser, _ string) (time.Time, error) {
	return time.Now(), nil
}

func (f *fakeSecurityFiles) PermanentDelete(_ context.Context, _ domain.AuthUser, _ string) error {
	f.deleted = true
	return nil
}

// fakeSecurityVault emulates Vault Core: manifest and chunks remain intact
// regardless of application-layer deletion, destructive operations are rejected,
// and the object reconstructs to the original bytes.
type fakeSecurityVault struct {
	content       []byte
	rejectDestroy bool // when true, destructive ops are blocked (correct behavior)
}

func (v *fakeSecurityVault) GetManifest(_ context.Context, manifestID string) (vaultclient.ManifestRecord, error) {
	return vaultclient.ManifestRecord{
		ManifestID:     manifestID,
		FileHash:       "filehash-xyz",
		ChunkHashes:    []string{"chunkhash-1", "chunkhash-2"},
		ChunkCount:     2,
		TotalSizeBytes: int64(len(v.content)),
		Immutable:      true,
	}, nil
}

func (v *fakeSecurityVault) GetChunkStatus(_ context.Context, chunkHash string) (vaultclient.ChunkStatusResponse, error) {
	return vaultclient.ChunkStatusResponse{
		Status:    "ok",
		ChunkHash: chunkHash,
		Exists:    true,
		ChunkRecord: vaultclient.ChunkRecord{
			ChunkHash: chunkHash,
			SizeBytes: 100,
			Retained:  true,
		},
	}, nil
}

func (v *fakeSecurityVault) DownloadObject(_ context.Context, _ string) (io.ReadCloser, int64, error) {
	return io.NopCloser(bytes.NewReader(v.content)), int64(len(v.content)), nil
}

func (v *fakeSecurityVault) AttemptManifestMutation(_ context.Context, method, _ string, _ []byte) (vaultclient.MutationAttempt, error) {
	if v.rejectDestroy {
		return vaultclient.MutationAttempt{
			Method:     method,
			StatusCode: 403,
			Error:      vaultclient.ErrorContract{Code: "operation_forbidden", Method: method},
			RawBody:    `{"status":"error","error":{"code":"operation_forbidden"}}`,
		}, nil
	}
	return vaultclient.MutationAttempt{Method: method, StatusCode: 200, RawBody: "{}"}, nil
}

func collectEvents() (EmitFunc, *[]SecurityLabEvent) {
	var events []SecurityLabEvent
	emit := func(e SecurityLabEvent) { events = append(events, e) }
	return emit, &events
}

func TestSecurityLabRunAllInvariantsHold(t *testing.T) {
	demo := []byte("seed") // overwritten by Upload with the generated content
	files := &fakeSecurityFiles{}
	vault := &fakeSecurityVault{rejectDestroy: true}
	// Keep vault content in sync with whatever the service uploaded.
	svc := NewSecurityLabService(files, vault)

	emit, events := collectEvents()
	// Pre-seed vault content via a wrapper: run once to capture uploaded content.
	// Simpler: intercept by pointing vault.content at files.content after upload.
	// We achieve this by running and then asserting; the fake Upload stores content,
	// and DownloadObject must return the same bytes. Wire them:
	vault.content = nil
	_ = demo

	// Because Upload stores into files.content and DownloadObject reads vault.content,
	// link them through a small adapter run.
	summary, err := runLinked(svc, files, vault, emit)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !summary.Passed {
		t.Fatalf("expected scenario to pass, summary=%+v", summary)
	}
	if !summary.AppLayerCompromised {
		t.Errorf("expected app layer compromised")
	}
	if !summary.VaultManifestIntact {
		t.Errorf("expected vault manifest intact")
	}
	if summary.UDSAttacksAttempted == 0 || summary.UDSAttacksBlocked != summary.UDSAttacksAttempted {
		t.Errorf("expected all UDS attacks blocked, got %d/%d", summary.UDSAttacksBlocked, summary.UDSAttacksAttempted)
	}
	if !summary.ReconstructionIdentical {
		t.Errorf("expected reconstruction identical")
	}

	// Phase coverage check.
	phases := map[string]bool{}
	var blockedSeen bool
	for _, e := range *events {
		phases[e.Phase] = true
		if e.Status == SecurityStatusBlocked {
			blockedSeen = true
		}
	}
	for _, want := range []string{SecurityPhaseBefore, SecurityPhaseAttackApp, SecurityPhaseProof, SecurityPhaseAttackUDS, SecurityPhaseAfter} {
		if !phases[want] {
			t.Errorf("missing events for phase %s", want)
		}
	}
	if !blockedSeen {
		t.Errorf("expected at least one 'blocked' event in ATTACK_UDS phase")
	}
}

func TestSecurityLabRunDetectsUDSBreach(t *testing.T) {
	files := &fakeSecurityFiles{}
	vault := &fakeSecurityVault{rejectDestroy: false} // vault wrongly allows destruction
	svc := NewSecurityLabService(files, vault)

	emit, _ := collectEvents()
	summary, err := runLinked(svc, files, vault, emit)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if summary.Passed {
		t.Fatalf("expected scenario to FAIL when vault does not block destructive ops")
	}
	if summary.UDSAttacksBlocked != 0 {
		t.Errorf("expected 0 blocked attacks, got %d", summary.UDSAttacksBlocked)
	}
}

func TestSecurityLabRunPropagatesUploadError(t *testing.T) {
	files := &fakeSecurityFiles{}
	vault := &fakeSecurityVault{rejectDestroy: true}
	svc := NewSecurityLabService(&errUpload{files}, vault)

	emit, _ := collectEvents()
	_, err := svc.Run(context.Background(), domain.AuthUser{UserID: "u"}, emit)
	if err == nil {
		t.Fatalf("expected error to propagate from failed upload")
	}
}

// errUpload wraps the fake to force an upload failure.
type errUpload struct{ *fakeSecurityFiles }

func (e *errUpload) Upload(_ context.Context, _ domain.AuthUser, _, _, _ string, _ io.Reader) (UploadOutcome, error) {
	return UploadOutcome{}, errors.New("boom")
}

// runLinked wires the fake file store's uploaded content into the fake vault's
// reconstruction output, so the byte-to-byte comparison is meaningful.
func runLinked(svc *SecurityLabService, files *fakeSecurityFiles, vault *fakeSecurityVault, emit EmitFunc) (SecurityLabSummary, error) {
	// Intercept upload by running the scenario with an emit hook that, on the
	// first BEFORE upload event, copies the stored content into the vault.
	wrapped := func(e SecurityLabEvent) {
		if files.content != nil && vault.content == nil {
			vault.content = files.content
		}
		emit(e)
	}
	return svc.Run(context.Background(), domain.AuthUser{UserID: "u"}, wrapped)
}
