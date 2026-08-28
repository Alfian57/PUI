package service

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"time"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"github.com/alfiang/pui/environment-a/api-service/internal/vaultclient"
)

// Phase identifiers for the ransomware-mitigation scenario. They are emitted on
// every event so the consumer (web UI or integration test) can group steps.
const (
	SecurityPhaseBefore    = "BEFORE"
	SecurityPhaseAttackApp = "ATTACK_APP"
	SecurityPhaseProof     = "PROOF"
	SecurityPhaseAttackUDS = "ATTACK_UDS"
	SecurityPhaseAfter     = "AFTER"
)

// Event status values.
const (
	SecurityStatusInfo    = "info"    // neutral, informational step
	SecurityStatusOK      = "ok"      // a system invariant held as expected
	SecurityStatusBlocked = "blocked" // a destructive operation was rejected by Vault Core
	SecurityStatusBreach  = "breach"  // an invariant did NOT hold (security failure)
)

// SecurityLabEvent is a single, factual step in the scenario. Every value placed
// in Data originates from a real system response so it can be independently
// verified by an examiner; this is a system test, not a staged animation.
type SecurityLabEvent struct {
	RunID     string         `json:"run_id"`
	Phase     string         `json:"phase"`
	Step      string         `json:"step"`
	Status    string         `json:"status"`
	Title     string         `json:"title"`
	Detail    string         `json:"detail"`
	Data      map[string]any `json:"data,omitempty"`
	Timestamp time.Time      `json:"timestamp"`
}

// SecurityLabSummary is the machine-checkable outcome of a run. The integration
// test (Tipe 2) asserts on these fields; the UI (Tipe 1) renders them.
type SecurityLabSummary struct {
	RunID                   string `json:"run_id"`
	ManifestID              string `json:"manifest_id"`
	DemoFileName            string `json:"demo_file_name"`
	FileHashBefore          string `json:"file_hash_before"`
	FileHashAfter           string `json:"file_hash_after"`
	ChunkCountBefore        int    `json:"chunk_count_before"`
	ChunkCountAfter         int    `json:"chunk_count_after"`
	ImmutableBefore         bool   `json:"immutable_before"`
	ImmutableAfter          bool   `json:"immutable_after"`
	AppLayerCompromised     bool   `json:"app_layer_compromised"`
	VaultManifestIntact     bool   `json:"vault_manifest_intact"`
	ChunksVerified          int    `json:"chunks_verified"`
	UDSAttacksAttempted     int    `json:"uds_attacks_attempted"`
	UDSAttacksBlocked       int    `json:"uds_attacks_blocked"`
	ReconstructionIdentical bool   `json:"reconstruction_identical"`
	ContentHashBefore       string `json:"content_hash_before"`
	ContentHashAfter        string `json:"content_hash_after"`
	Passed                  bool   `json:"passed"`
}

// securityFileOps is the application-layer surface the scenario exercises. It is
// satisfied by *FileService and faked in tests.
type securityFileOps interface {
	Upload(ctx context.Context, user domain.AuthUser, directoryID, fileName, mimeType string, reader io.Reader) (UploadOutcome, error)
	Detail(ctx context.Context, user domain.AuthUser, fileID string, includeDeleted bool) (domain.FileRecord, error)
	SoftDelete(ctx context.Context, user domain.AuthUser, fileID string) (time.Time, error)
	PermanentDelete(ctx context.Context, user domain.AuthUser, fileID string) error
}

// securityVaultOps is the storage-protocol surface the scenario exercises,
// including the attempted destructive operations. Satisfied by *vaultclient.Client.
type securityVaultOps interface {
	GetManifest(ctx context.Context, manifestID string) (vaultclient.ManifestRecord, error)
	GetChunkStatus(ctx context.Context, chunkHash string) (vaultclient.ChunkStatusResponse, error)
	DownloadObject(ctx context.Context, manifestID string) (io.ReadCloser, int64, error)
	AttemptManifestMutation(ctx context.Context, method, manifestID string, body []byte) (vaultclient.MutationAttempt, error)
}

// SecurityLabService orchestrates a ransomware-mitigation scenario that proves
// HashBox's separation of authority: compromising the application layer does NOT
// grant access to the immutable physical storage in Vault Core.
//
// The SAME orchestration is consumed by both testing modes (the visual browser
// console and the development integration test), guaranteeing that what is shown
// during a demo is exactly what is verified in development — there is no separate
// "demo-only" code path.
type SecurityLabService struct {
	files    securityFileOps
	vault    securityVaultOps
	recorder SecurityEventRecorder
}

func NewSecurityLabService(files securityFileOps, vault securityVaultOps, recorders ...SecurityEventRecorder) *SecurityLabService {
	var recorder SecurityEventRecorder
	if len(recorders) > 0 {
		recorder = recorders[0]
	}
	return &SecurityLabService{files: files, vault: vault, recorder: recorder}
}

// EmitFunc receives each scenario event as it happens.
type EmitFunc func(SecurityLabEvent)

func sha256Hex(b []byte) string {
	sum := sha256.Sum256(b)
	return hex.EncodeToString(sum[:])
}

// Run executes the five-phase scenario, invoking emit for every step, and returns
// a machine-checkable summary. A returned error indicates the scenario could not
// be executed (setup/transport failure) — it does NOT indicate a security
// failure; security failures are reported via event status "breach" and
// Summary.Passed == false.
func (s *SecurityLabService) Run(ctx context.Context, user domain.AuthUser, emit EmitFunc) (SecurityLabSummary, error) {
	if emit == nil {
		emit = func(SecurityLabEvent) {}
	}
	runID, err := NewSecurityRunID()
	if err != nil {
		return SecurityLabSummary{}, err
	}
	ctx = vaultclient.WithSecurityRunID(ctx, runID)

	send := func(phase, step, status, title, detail string, data map[string]any) {
		event := SecurityLabEvent{
			RunID:     runID,
			Phase:     phase,
			Step:      step,
			Status:    status,
			Title:     title,
			Detail:    detail,
			Data:      data,
			Timestamp: time.Now().UTC(),
		}
		s.recordLabEvent(ctx, event)
		emit(event)
	}

	var summary SecurityLabSummary
	summary.RunID = runID

	// ---------------------------------------------------------------------
	// PHASE 0 — BEFORE: upload a throwaway demo file and record real state.
	// ---------------------------------------------------------------------
	demoName := fmt.Sprintf("ransomware_demo_%d.txt", time.Now().UnixNano())
	demoContent := []byte(fmt.Sprintf(
		"HashBox Security Lab — berkas demo uji mitigasi ransomware.\n"+
			"Dibuat: %s\nKonten ini sengaja dibuat untuk diserang dan dibuktikan tetap utuh.\n",
		time.Now().UTC().Format(time.RFC3339Nano),
	))
	summary.DemoFileName = demoName
	summary.ContentHashBefore = sha256Hex(demoContent)

	send(SecurityPhaseBefore, "create_demo_file", SecurityStatusInfo,
		"Menyiapkan berkas demo",
		"Membuat berkas throwaway khusus simulasi, tanpa menyentuh data asli pengguna.",
		map[string]any{
			"file_name":    demoName,
			"size_bytes":   len(demoContent),
			"local_sha256": summary.ContentHashBefore,
		})

	uploadOutcome, err := s.files.Upload(ctx, user, "", demoName, "text/plain", bytes.NewReader(demoContent))
	if err != nil {
		send(SecurityPhaseBefore, "upload", SecurityStatusBreach, "Gagal mengunggah berkas demo", err.Error(), nil)
		return summary, fmt.Errorf("security lab: upload demo file: %w", err)
	}

	fileID := uploadOutcome.File.ID
	manifestID := uploadOutcome.File.ManifestID
	summary.ManifestID = manifestID

	send(SecurityPhaseBefore, "upload", SecurityStatusOK,
		"Berkas demo tersimpan di HashBox",
		"Berkas diunggah melalui jalur normal: metadata di PostgreSQL, konten fisik di Vault Core.",
		map[string]any{
			"file_id":     fileID,
			"manifest_id": manifestID,
			"chunk_count": uploadOutcome.UploadCommitResult.ChunkCount,
			"file_hash":   uploadOutcome.UploadCommitResult.FileHash,
			"dedup_ratio": uploadOutcome.UploadCommitResult.DedupRatio,
			"immutable":   uploadOutcome.UploadCommitResult.Immutable,
		})

	// Record authoritative initial state from Vault Core (source of truth).
	manifestBefore, err := s.vault.GetManifest(ctx, manifestID)
	if err != nil {
		send(SecurityPhaseBefore, "read_manifest", SecurityStatusBreach, "Gagal membaca manifest awal", err.Error(), nil)
		return summary, fmt.Errorf("security lab: read manifest before: %w", err)
	}
	summary.FileHashBefore = manifestBefore.FileHash
	summary.ChunkCountBefore = manifestBefore.ChunkCount
	summary.ImmutableBefore = manifestBefore.Immutable

	send(SecurityPhaseBefore, "record_state", SecurityStatusInfo,
		"Merekam state awal dari Vault Core",
		"Nilai-nilai ini diambil langsung dari Vault Core dan menjadi acuan pembanding di akhir.",
		map[string]any{
			"manifest_id":  manifestBefore.ManifestID,
			"file_hash":    manifestBefore.FileHash,
			"chunk_count":  manifestBefore.ChunkCount,
			"immutable":    manifestBefore.Immutable,
			"total_bytes":  manifestBefore.TotalSizeBytes,
			"chunk_hashes": manifestBefore.ChunkHashes,
		})

	// ---------------------------------------------------------------------
	// PHASE 1 — ATTACK A: compromise the application layer (Postgres metadata).
	// ---------------------------------------------------------------------
	send(SecurityPhaseAttackApp, "intro", SecurityStatusInfo,
		"Skenario: penyerang menguasai lapisan aplikasi",
		"Penyerang memegang token sah dan mencoba menghancurkan berkas seperti ransomware: hapus dari aplikasi.",
		nil)

	if _, err := s.files.SoftDelete(ctx, user, fileID); err != nil {
		send(SecurityPhaseAttackApp, "soft_delete", SecurityStatusBreach, "Soft delete gagal", err.Error(), nil)
		return summary, fmt.Errorf("security lab: soft delete: %w", err)
	}
	send(SecurityPhaseAttackApp, "soft_delete", SecurityStatusOK,
		"Berkas dipindahkan ke Sampah (soft delete)",
		"Metadata ditandai terhapus pada lapisan aplikasi.",
		map[string]any{"file_id": fileID})

	if err := s.files.PermanentDelete(ctx, user, fileID); err != nil {
		send(SecurityPhaseAttackApp, "permanent_delete", SecurityStatusBreach, "Permanent delete gagal", err.Error(), nil)
		return summary, fmt.Errorf("security lab: permanent delete: %w", err)
	}
	send(SecurityPhaseAttackApp, "permanent_delete", SecurityStatusOK,
		"Metadata dihapus permanen dari PostgreSQL",
		"Serangan lapisan aplikasi berhasil: catatan berkas hilang dari database.",
		map[string]any{"file_id": fileID})

	// Confirm the application can no longer find the file.
	if _, detailErr := s.files.Detail(ctx, user, fileID, true); detailErr != nil {
		summary.AppLayerCompromised = true
		send(SecurityPhaseAttackApp, "verify_gone", SecurityStatusOK,
			"Konfirmasi: berkas tidak dapat diakses via API aplikasi",
			"Permintaan detail berkas kini ditolak — lapisan aplikasi benar-benar kehilangan berkas.",
			map[string]any{"file_id": fileID, "lookup_error": detailErr.Error()})
	} else {
		send(SecurityPhaseAttackApp, "verify_gone", SecurityStatusBreach,
			"Berkas masih dapat diakses setelah penghapusan permanen",
			"Tidak terduga: metadata seharusnya sudah terhapus.",
			map[string]any{"file_id": fileID})
	}

	// ---------------------------------------------------------------------
	// PHASE 2 — PROOF: Vault Core remains intact despite the app-layer breach.
	// ---------------------------------------------------------------------
	send(SecurityPhaseProof, "intro", SecurityStatusInfo,
		"Memeriksa Vault Core setelah serangan lapisan aplikasi",
		"Apakah konten fisik immutable ikut hilang? Kita query langsung ke Vault Core via UDS.",
		nil)

	manifestProof, err := s.vault.GetManifest(ctx, manifestID)
	if err != nil {
		send(SecurityPhaseProof, "read_manifest", SecurityStatusBreach,
			"Manifest hilang dari Vault Core", err.Error(), map[string]any{"manifest_id": manifestID})
		return summary, fmt.Errorf("security lab: read manifest proof: %w", err)
	}
	summary.VaultManifestIntact = true
	send(SecurityPhaseProof, "read_manifest", SecurityStatusOK,
		"Manifest masih utuh di Vault Core",
		"Meski metadata aplikasi terhapus, manifest immutable tetap ada.",
		map[string]any{
			"manifest_id": manifestProof.ManifestID,
			"file_hash":   manifestProof.FileHash,
			"chunk_count": manifestProof.ChunkCount,
			"immutable":   manifestProof.Immutable,
		})

	chunksVerified := 0
	for i, chunkHash := range manifestProof.ChunkHashes {
		status, chunkErr := s.vault.GetChunkStatus(ctx, chunkHash)
		if chunkErr != nil {
			send(SecurityPhaseProof, "verify_chunk", SecurityStatusBreach,
				fmt.Sprintf("Gagal memverifikasi chunk #%d", i+1), chunkErr.Error(),
				map[string]any{"chunk_hash": chunkHash})
			continue
		}
		if status.Exists {
			chunksVerified++
			send(SecurityPhaseProof, "verify_chunk", SecurityStatusOK,
				fmt.Sprintf("Chunk fisik #%d ada di disk", i+1),
				"Chunk konten masih tersimpan di Vault Core.",
				map[string]any{"chunk_hash": chunkHash, "size_bytes": status.ChunkRecord.SizeBytes})
		} else {
			send(SecurityPhaseProof, "verify_chunk", SecurityStatusBreach,
				fmt.Sprintf("Chunk fisik #%d hilang", i+1),
				"Chunk seharusnya masih ada.",
				map[string]any{"chunk_hash": chunkHash})
		}
	}
	summary.ChunksVerified = chunksVerified

	// ---------------------------------------------------------------------
	// PHASE 3 — ATTACK B: attack Vault Core directly over UDS.
	// ---------------------------------------------------------------------
	send(SecurityPhaseAttackUDS, "intro", SecurityStatusInfo,
		"Skenario: penyerang menyerang Vault Core langsung via UDS",
		"Penyerang mencoba menghapus/menimpa manifest immutable melalui protokol penyimpanan (gaya enkripsi ransomware).",
		nil)

	attacks := []struct {
		method string
		label  string
		body   []byte
	}{
		{method: "DELETE", label: "Hapus manifest", body: nil},
		{method: "PUT", label: "Timpa manifest (enkripsi)", body: []byte(`{"corrupted":true}`)},
		{method: "PATCH", label: "Modifikasi sebagian manifest", body: []byte(`{"immutable":false}`)},
	}

	for _, atk := range attacks {
		summary.UDSAttacksAttempted++
		attempt, attemptErr := s.vault.AttemptManifestMutation(ctx, atk.method, manifestID, atk.body)
		if attemptErr != nil {
			send(SecurityPhaseAttackUDS, "attack_"+atk.method, SecurityStatusBreach,
				fmt.Sprintf("%s: kesalahan transport", atk.label), attemptErr.Error(),
				map[string]any{"method": atk.method})
			continue
		}

		if attempt.Blocked() {
			summary.UDSAttacksBlocked++
			send(SecurityPhaseAttackUDS, "attack_"+atk.method, SecurityStatusBlocked,
				fmt.Sprintf("%s — DITOLAK VAULT CORE", atk.label),
				"Vault Core menolak operasi destruktif di tingkat protokol (HTTP 403 operation_forbidden).",
				map[string]any{
					"method":       atk.method,
					"status_code":  attempt.StatusCode,
					"error_code":   attempt.Error.Code,
					"raw_response": attempt.RawBody,
				})
		} else {
			send(SecurityPhaseAttackUDS, "attack_"+atk.method, SecurityStatusBreach,
				fmt.Sprintf("%s — TIDAK ditolak!", atk.label),
				"Operasi destruktif tidak ditolak sebagaimana mestinya.",
				map[string]any{
					"method":       atk.method,
					"status_code":  attempt.StatusCode,
					"raw_response": attempt.RawBody,
				})
		}
	}

	// ---------------------------------------------------------------------
	// PHASE 4 — AFTER: reconstruct from Vault Core and compare byte-to-byte.
	// ---------------------------------------------------------------------
	send(SecurityPhaseAfter, "intro", SecurityStatusInfo,
		"Rekonstruksi & verifikasi akhir",
		"Mengambil objek langsung dari Vault Core, lalu membandingkan dengan berkas asli byte-to-byte.",
		nil)

	body, _, err := s.vault.DownloadObject(ctx, manifestID)
	if err != nil {
		send(SecurityPhaseAfter, "reconstruct", SecurityStatusBreach,
			"Gagal merekonstruksi objek dari Vault Core", err.Error(),
			map[string]any{"manifest_id": manifestID})
		return summary, fmt.Errorf("security lab: reconstruct object: %w", err)
	}
	reconstructed, readErr := io.ReadAll(body)
	_ = body.Close()
	if readErr != nil {
		send(SecurityPhaseAfter, "reconstruct", SecurityStatusBreach,
			"Gagal membaca objek hasil rekonstruksi", readErr.Error(), nil)
		return summary, fmt.Errorf("security lab: read reconstructed object: %w", readErr)
	}

	summary.ContentHashAfter = sha256Hex(reconstructed)
	summary.ReconstructionIdentical = bytes.Equal(reconstructed, demoContent)

	if summary.ReconstructionIdentical {
		send(SecurityPhaseAfter, "compare", SecurityStatusOK,
			"Konten IDENTIK dengan berkas asli",
			"Rekonstruksi byte-to-byte cocok: data tidak berubah sedikit pun meski diserang.",
			map[string]any{
				"content_sha256_before": summary.ContentHashBefore,
				"content_sha256_after":  summary.ContentHashAfter,
			})
	} else {
		send(SecurityPhaseAfter, "compare", SecurityStatusBreach,
			"Konten BERBEDA dari berkas asli",
			"Rekonstruksi tidak cocok: integritas data gagal.",
			map[string]any{
				"content_sha256_before": summary.ContentHashBefore,
				"content_sha256_after":  summary.ContentHashAfter,
			})
	}

	manifestAfter, err := s.vault.GetManifest(ctx, manifestID)
	if err != nil {
		send(SecurityPhaseAfter, "final_manifest", SecurityStatusBreach,
			"Gagal membaca manifest akhir", err.Error(), nil)
		return summary, fmt.Errorf("security lab: read manifest after: %w", err)
	}
	summary.FileHashAfter = manifestAfter.FileHash
	summary.ChunkCountAfter = manifestAfter.ChunkCount
	summary.ImmutableAfter = manifestAfter.Immutable

	// Final verdict: every invariant must hold.
	summary.Passed = summary.AppLayerCompromised &&
		summary.VaultManifestIntact &&
		summary.UDSAttacksAttempted > 0 &&
		summary.UDSAttacksBlocked == summary.UDSAttacksAttempted &&
		summary.ReconstructionIdentical &&
		summary.FileHashBefore == summary.FileHashAfter &&
		summary.ChunkCountBefore == summary.ChunkCountAfter &&
		summary.ImmutableAfter

	finalStatus := SecurityStatusOK
	finalTitle := "Demo selesai — semua invariant keamanan terjaga"
	if !summary.Passed {
		finalStatus = SecurityStatusBreach
		finalTitle = "Demo selesai — ada invariant yang gagal"
	}
	send(SecurityPhaseAfter, "summary", finalStatus, finalTitle,
		"Pemisahan otoritas terbukti: penguasaan lapisan aplikasi tidak memberi akses ke penyimpanan immutable Vault Core.",
		map[string]any{
			"manifest_id":              summary.ManifestID,
			"file_hash_before":         summary.FileHashBefore,
			"file_hash_after":          summary.FileHashAfter,
			"chunk_count_before":       summary.ChunkCountBefore,
			"chunk_count_after":        summary.ChunkCountAfter,
			"immutable_after":          summary.ImmutableAfter,
			"app_layer_compromised":    summary.AppLayerCompromised,
			"vault_manifest_intact":    summary.VaultManifestIntact,
			"uds_attacks_attempted":    summary.UDSAttacksAttempted,
			"uds_attacks_blocked":      summary.UDSAttacksBlocked,
			"reconstruction_identical": summary.ReconstructionIdentical,
			"passed":                   summary.Passed,
		})
	s.recordLabSummary(ctx, summary)

	return summary, nil
}

func (s *SecurityLabService) recordLabEvent(ctx context.Context, event SecurityLabEvent) {
	if s.recorder == nil {
		return
	}
	severity := domain.SecuritySeverityMedium
	if event.Status == SecurityStatusBlocked {
		severity = domain.SecuritySeverityHigh
	} else if event.Status == SecurityStatusBreach {
		severity = domain.SecuritySeverityCritical
	}
	recordCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 2*time.Second)
	defer cancel()
	_, err := s.recorder.Record(recordCtx, domain.SecurityEventInput{
		RunID:      event.RunID,
		EventType:  domain.SecurityEventLabEvent,
		Source:     domain.SecuritySourceSecurityLab,
		Severity:   severity,
		Outcome:    event.Status,
		Phase:      event.Phase,
		Step:       event.Step,
		Title:      event.Title,
		Detail:     event.Detail,
		Details:    event.Data,
		OccurredAt: event.Timestamp,
	})
	recordSecurityEventError(err)
}

func (s *SecurityLabService) recordLabSummary(ctx context.Context, summary SecurityLabSummary) {
	if s.recorder == nil {
		return
	}
	outcome := domain.SecurityOutcomeOK
	severity := domain.SecuritySeverityMedium
	if !summary.Passed {
		outcome = domain.SecurityOutcomeBreach
		severity = domain.SecuritySeverityCritical
	}
	recordCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 2*time.Second)
	defer cancel()
	_, err := s.recorder.Record(recordCtx, domain.SecurityEventInput{
		RunID:     summary.RunID,
		EventType: domain.SecurityEventLabSummary,
		Source:    domain.SecuritySourceSecurityLab,
		Severity:  severity,
		Outcome:   outcome,
		Title:     "Security Lab summary",
		Detail:    "Ringkasan hasil simulasi Security Lab.",
		Details: map[string]any{
			"manifest_id":              summary.ManifestID,
			"file_hash_before":         summary.FileHashBefore,
			"file_hash_after":          summary.FileHashAfter,
			"chunk_count_before":       summary.ChunkCountBefore,
			"chunk_count_after":        summary.ChunkCountAfter,
			"immutable_before":         summary.ImmutableBefore,
			"immutable_after":          summary.ImmutableAfter,
			"app_layer_compromised":    summary.AppLayerCompromised,
			"vault_manifest_intact":    summary.VaultManifestIntact,
			"chunks_verified":          summary.ChunksVerified,
			"uds_attacks_attempted":    summary.UDSAttacksAttempted,
			"uds_attacks_blocked":      summary.UDSAttacksBlocked,
			"reconstruction_identical": summary.ReconstructionIdentical,
			"content_hash_before":      summary.ContentHashBefore,
			"content_hash_after":       summary.ContentHashAfter,
			"passed":                   summary.Passed,
		},
	})
	recordSecurityEventError(err)
}
