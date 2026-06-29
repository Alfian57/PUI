//go:build integration

// Package security_test contains the Type-2 (development) security test for
// HashBox. Unlike the visual browser console (Type 1), this runs headless and
// is meant to be executed regularly during development and in CI to assert that
// the ransomware-mitigation invariants hold.
//
// It drives the SAME SecurityLabService logic as the visual demo, but through
// the live SSE endpoint, then asserts on the structured summary. This guarantees
// the development test and the presentation demo exercise identical system code.
//
// Prerequisites:
//   - The full stack is running (make compose-up).
//   - SECURITY_LAB_ENABLED=true for the api-service.
//   - The dev user (gading@gmail.com / password) is seeded.
//
// Run with: make security-test   (or: go test -tags=integration ./...)
package security_test

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"testing"
	"time"
)

func baseURL() string {
	if v := strings.TrimSpace(os.Getenv("HASHBOX_API_BASE_URL")); v != "" {
		return strings.TrimRight(v, "/")
	}
	return "http://127.0.0.1:8080/api/v1"
}

func credentials() (string, string) {
	email := os.Getenv("HASHBOX_TEST_EMAIL")
	if email == "" {
		email = "gading@gmail.com"
	}
	password := os.Getenv("HASHBOX_TEST_PASSWORD")
	if password == "" {
		password = "password"
	}
	return email, password
}

// securityLabSummary mirrors service.SecurityLabSummary (the JSON contract).
type securityLabSummary struct {
	ManifestID              string `json:"manifest_id"`
	FileHashBefore          string `json:"file_hash_before"`
	FileHashAfter           string `json:"file_hash_after"`
	ChunkCountBefore        int    `json:"chunk_count_before"`
	ChunkCountAfter         int    `json:"chunk_count_after"`
	ImmutableAfter          bool   `json:"immutable_after"`
	AppLayerCompromised     bool   `json:"app_layer_compromised"`
	VaultManifestIntact     bool   `json:"vault_manifest_intact"`
	ChunksVerified          int    `json:"chunks_verified"`
	UDSAttacksAttempted     int    `json:"uds_attacks_attempted"`
	UDSAttacksBlocked       int    `json:"uds_attacks_blocked"`
	ReconstructionIdentical bool   `json:"reconstruction_identical"`
	Passed                  bool   `json:"passed"`
}

func login(t *testing.T) string {
	t.Helper()
	email, password := credentials()
	payload, _ := json.Marshal(map[string]string{"email": email, "password": password})

	resp, err := http.Post(baseURL()+"/auth/login", "application/json", bytes.NewReader(payload))
	if err != nil {
		t.Skipf("stack tidak dapat dihubungi di %s (jalankan: make compose-up): %v", baseURL(), err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("login gagal: status %d", resp.StatusCode)
	}

	var body struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("decode login response: %v", err)
	}
	if body.AccessToken == "" {
		t.Fatalf("login response tanpa access_token")
	}
	return body.AccessToken
}

// TestSecurityLabRansomwareMitigation runs the full scenario against the live
// stack and asserts every security invariant.
func TestSecurityLabRansomwareMitigation(t *testing.T) {
	token := login(t)

	req, err := http.NewRequest(http.MethodGet, baseURL()+"/security-lab/run", nil)
	if err != nil {
		t.Fatalf("build request: %v", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "text/event-stream")

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("call security-lab endpoint: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		t.Skip("SECURITY_LAB_ENABLED belum aktif di api-service; set true lalu jalankan ulang")
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status tak terduga dari endpoint: %d", resp.StatusCode)
	}

	var (
		summary    securityLabSummary
		gotSummary bool
		gotDone    bool
		phaseCount int
		blocked    int
		breaches   []string
	)

	// Parse the SSE stream: lines of "event: <name>" followed by "data: <json>".
	scanner := bufio.NewScanner(resp.Body)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)
	var currentEvent string
	for scanner.Scan() {
		line := scanner.Text()
		switch {
		case strings.HasPrefix(line, "event: "):
			currentEvent = strings.TrimPrefix(line, "event: ")
		case strings.HasPrefix(line, "data: "):
			data := strings.TrimPrefix(line, "data: ")
			switch currentEvent {
			case "phase":
				phaseCount++
				var ev struct {
					Phase  string `json:"phase"`
					Status string `json:"status"`
					Title  string `json:"title"`
				}
				if err := json.Unmarshal([]byte(data), &ev); err == nil {
					if ev.Status == "blocked" {
						blocked++
					}
					if ev.Status == "breach" {
						breaches = append(breaches, fmt.Sprintf("[%s] %s", ev.Phase, ev.Title))
					}
				}
			case "summary":
				if err := json.Unmarshal([]byte(data), &summary); err != nil {
					t.Fatalf("decode summary: %v", err)
				}
				gotSummary = true
			case "done":
				gotDone = true
			case "error":
				t.Fatalf("scenario melaporkan error: %s", data)
			}
		}
	}
	if err := scanner.Err(); err != nil {
		t.Fatalf("baca SSE stream: %v", err)
	}

	// Structural assertions on the stream.
	if !gotSummary {
		t.Fatal("tidak menerima event summary")
	}
	if !gotDone {
		t.Fatal("tidak menerima event done")
	}
	if phaseCount == 0 {
		t.Fatal("tidak menerima event phase apa pun")
	}
	if len(breaches) > 0 {
		t.Errorf("terdapat event breach: %v", breaches)
	}

	// Invariant assertions on the summary.
	checks := []struct {
		name string
		cond bool
	}{
		{"serangan lapisan aplikasi berhasil (metadata terhapus)", summary.AppLayerCompromised},
		{"manifest Vault Core tetap utuh", summary.VaultManifestIntact},
		{"ada percobaan serangan UDS", summary.UDSAttacksAttempted > 0},
		{"semua serangan UDS ditolak", summary.UDSAttacksBlocked == summary.UDSAttacksAttempted},
		{"jumlah blocked event >= jumlah serangan UDS", blocked >= summary.UDSAttacksAttempted},
		{"rekonstruksi byte-to-byte identik", summary.ReconstructionIdentical},
		{"file hash sebelum == sesudah", summary.FileHashBefore == summary.FileHashAfter},
		{"chunk count sebelum == sesudah", summary.ChunkCountBefore == summary.ChunkCountAfter},
		{"manifest tetap immutable", summary.ImmutableAfter},
		{"verdict akhir passed", summary.Passed},
	}
	for _, c := range checks {
		if !c.cond {
			t.Errorf("INVARIANT GAGAL: %s", c.name)
		} else {
			t.Logf("✔ %s", c.name)
		}
	}

	t.Logf("Ringkasan: manifest=%s chunks_verified=%d uds_blocked=%d/%d passed=%v",
		summary.ManifestID, summary.ChunksVerified, summary.UDSAttacksBlocked, summary.UDSAttacksAttempted, summary.Passed)
}
