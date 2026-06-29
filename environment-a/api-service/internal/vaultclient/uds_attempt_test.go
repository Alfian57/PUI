package vaultclient

import (
	"context"
	"encoding/json"
	"net"
	"net/http"
	"path/filepath"
	"testing"
	"time"
)

// newRejectingVaultServer starts a minimal Unix Domain Socket server that mimics
// the relevant Vault Core behavior: it rejects destructive methods (DELETE/PUT/
// PATCH) on the manifest endpoint with 403 operation_forbidden, exactly like the
// real environment-b/vault-core handler does.
func newRejectingVaultServer(t *testing.T) string {
	t.Helper()

	socketPath := filepath.Join(t.TempDir(), "vault-core.sock")
	listener, err := net.Listen("unix", socketPath)
	if err != nil {
		t.Fatalf("listen uds: %v", err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/internal/v1/manifests/", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodDelete, http.MethodPut, http.MethodPatch:
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			_ = json.NewEncoder(w).Encode(map[string]any{
				"status": "error",
				"error": map[string]any{
					"code":    "operation_forbidden",
					"message": "immutable vault menolak operasi destruktif",
					"method":  r.Method,
					"path":    r.URL.Path,
				},
			})
		default:
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(map[string]any{"status": "ok"})
		}
	})

	server := &http.Server{Handler: mux}
	go func() { _ = server.Serve(listener) }()
	t.Cleanup(func() {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		_ = server.Shutdown(ctx)
		_ = listener.Close()
	})

	return socketPath
}

func TestAttemptManifestMutationBlockedByVault(t *testing.T) {
	socketPath := newRejectingVaultServer(t)
	client := New(socketPath)

	manifestID := "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"

	cases := []struct {
		name   string
		method string
		body   []byte
	}{
		{name: "delete manifest", method: http.MethodDelete, body: nil},
		{name: "overwrite manifest", method: http.MethodPut, body: []byte(`{"corrupted":true}`)},
		{name: "patch manifest", method: http.MethodPatch, body: []byte(`{"immutable":false}`)},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			attempt, err := client.AttemptManifestMutation(context.Background(), tc.method, manifestID, tc.body)
			if err != nil {
				t.Fatalf("transport error (a policy rejection must NOT be an error): %v", err)
			}

			if !attempt.Blocked() {
				t.Fatalf("expected attempt to be blocked, got status=%d code=%q", attempt.StatusCode, attempt.Error.Code)
			}
			if attempt.StatusCode != http.StatusForbidden {
				t.Fatalf("expected 403, got %d", attempt.StatusCode)
			}
			if attempt.Error.Code != "operation_forbidden" {
				t.Fatalf("expected operation_forbidden, got %q", attempt.Error.Code)
			}
			if attempt.Error.Method != tc.method {
				t.Fatalf("expected echoed method %q, got %q", tc.method, attempt.Error.Method)
			}
			if attempt.RawBody == "" {
				t.Fatalf("expected non-empty raw body for examiner inspection")
			}
		})
	}
}

func TestAttemptManifestMutationTransportError(t *testing.T) {
	// Point the client at a socket path that does not exist: this is a genuine
	// transport failure and MUST surface as an error.
	client := New(filepath.Join(t.TempDir(), "missing.sock"))

	_, err := client.AttemptManifestMutation(context.Background(), http.MethodDelete, "manifest-id", nil)
	if err == nil {
		t.Fatalf("expected transport error for missing socket, got nil")
	}
}
