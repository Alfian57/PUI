package uds

import (
	"bytes"
	"context"
	"encoding/json"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/alfiang/pui/environment-b/vault-core/internal/config"
	"github.com/dgraph-io/badger/v4"
)

// newTestServer creates a fresh UDS server and returns an HTTP client bound to it.
func newTestServer(t *testing.T) (client *http.Client, stop func()) {
	t.Helper()

	root := t.TempDir()
	socketPath := filepath.Join(root, "vault.sock")
	badgerPath := filepath.Join(root, "badger")
	chunkRoot := filepath.Join(root, "chunks")

	opts := badger.DefaultOptions(badgerPath)
	opts.Logger = nil

	db, err := badger.Open(opts)
	if err != nil {
		t.Fatalf("open badger: %v", err)
	}

	h := NewHandler(config.Config{
		AppEnv:              "test",
		UDSPath:             socketPath,
		BadgerPath:          badgerPath,
		ChunkRoot:           chunkRoot,
		UDSAllowedUIDs:      []uint32{uint32(os.Getuid())},
		FastCDCMinChunkSize: 1024,
		FastCDCAvgChunkSize: 2048,
		FastCDCMaxChunkSize: 4096,
	}, db)

	listener, err := net.Listen("unix", socketPath)
	if err != nil {
		t.Fatalf("listen: %v", err)
	}

	server := &http.Server{
		Handler: h,
		ConnContext: func(ctx context.Context, c net.Conn) context.Context {
			return context.WithValue(ctx, connContextKey{}, c)
		},
	}

	go func() { _ = server.Serve(listener) }()

	c := &http.Client{
		Timeout: 3 * time.Second,
		Transport: &http.Transport{
			DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
				return new(net.Dialer).DialContext(ctx, "unix", socketPath)
			},
		},
	}

	return c, func() {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		_ = server.Shutdown(ctx)
		_ = db.Close()
	}
}

func TestHandleHealthMethodNotAllowed(t *testing.T) {
	t.Parallel()

	client, stop := newTestServer(t)
	defer stop()

	req, _ := http.NewRequestWithContext(context.Background(), http.MethodPost, "http://unix/internal/v1/health", nil)
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusMethodNotAllowed {
		t.Fatalf("expected 405, got %d", resp.StatusCode)
	}
}

func TestHandleUploadEmptyBody(t *testing.T) {
	t.Parallel()

	client, stop := newTestServer(t)
	defer stop()

	req, _ := http.NewRequestWithContext(context.Background(), http.MethodPost, "http://unix/internal/v1/uploads", bytes.NewReader(nil))
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	// empty upload should be rejected (ErrInvalidUpload → 400)
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", resp.StatusCode)
	}
}

func TestHandleUploadMethodNotAllowed(t *testing.T) {
	t.Parallel()

	client, stop := newTestServer(t)
	defer stop()

	req, _ := http.NewRequestWithContext(context.Background(), http.MethodGet, "http://unix/internal/v1/uploads", nil)
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusMethodNotAllowed {
		t.Fatalf("expected 405, got %d", resp.StatusCode)
	}
}

func TestHandleManifestNotFound(t *testing.T) {
	t.Parallel()

	client, stop := newTestServer(t)
	defer stop()

	unknownID := strings.Repeat("f", 64)
	req, _ := http.NewRequestWithContext(context.Background(), http.MethodGet, "http://unix/internal/v1/manifests/"+unknownID, nil)
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", resp.StatusCode)
	}
}

func TestHandleManifestMissingID(t *testing.T) {
	t.Parallel()

	client, stop := newTestServer(t)
	defer stop()

	req, _ := http.NewRequestWithContext(context.Background(), http.MethodGet, "http://unix/internal/v1/manifests/", nil)
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", resp.StatusCode)
	}
}

func TestHandleManifestMethodNotAllowed(t *testing.T) {
	t.Parallel()

	client, stop := newTestServer(t)
	defer stop()

	req, _ := http.NewRequestWithContext(context.Background(), http.MethodPost, "http://unix/internal/v1/manifests/"+strings.Repeat("a", 64), nil)
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusMethodNotAllowed {
		t.Fatalf("expected 405, got %d", resp.StatusCode)
	}
}

func TestHandleManifestRetireAndRetain(t *testing.T) {
	t.Parallel()

	client, stop := newTestServer(t)
	defer stop()

	content := bytes.NewReader([]byte("lifecycle"))
	uploadReq, err := http.NewRequestWithContext(context.Background(), http.MethodPost, "http://unix/internal/v1/uploads", content)
	if err != nil {
		t.Fatalf("build upload request: %v", err)
	}
	uploadResp, err := client.Do(uploadReq)
	if err != nil {
		t.Fatalf("upload request: %v", err)
	}
	var uploadPayload struct {
		UploadCommitResult struct {
			ManifestID string `json:"manifest_id"`
		} `json:"upload_commit_result"`
	}
	if err := json.NewDecoder(uploadResp.Body).Decode(&uploadPayload); err != nil {
		_ = uploadResp.Body.Close()
		t.Fatalf("decode upload response: %v", err)
	}
	_ = uploadResp.Body.Close()
	manifestID := uploadPayload.UploadCommitResult.ManifestID
	if manifestID == "" {
		t.Fatal("upload response did not include manifest id")
	}

	for _, operation := range []string{"retire", "retain"} {
		req, err := http.NewRequestWithContext(context.Background(), http.MethodPost, "http://unix/internal/v1/manifests/"+manifestID+"/"+operation, nil)
		if err != nil {
			t.Fatalf("build %s request: %v", operation, err)
		}
		resp, err := client.Do(req)
		if err != nil {
			t.Fatalf("%s request: %v", operation, err)
		}
		if resp.StatusCode != http.StatusOK {
			_ = resp.Body.Close()
			t.Fatalf("%s returned status %d", operation, resp.StatusCode)
		}
		_ = resp.Body.Close()
	}

	getReq, err := http.NewRequestWithContext(context.Background(), http.MethodGet, "http://unix/internal/v1/manifests/"+manifestID, nil)
	if err != nil {
		t.Fatalf("build get manifest request: %v", err)
	}
	getResp, err := client.Do(getReq)
	if err != nil {
		t.Fatalf("get manifest request: %v", err)
	}
	defer getResp.Body.Close()
	var payload struct {
		Manifest struct {
			Retired bool `json:"retired"`
		} `json:"manifest_record"`
	}
	if err := json.NewDecoder(getResp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode manifest response: %v", err)
	}
	if payload.Manifest.Retired {
		t.Fatalf("expected retained manifest")
	}
}

func TestHandleObjectNotFound(t *testing.T) {
	t.Parallel()

	client, stop := newTestServer(t)
	defer stop()

	req, _ := http.NewRequestWithContext(context.Background(), http.MethodGet, "http://unix/internal/v1/objects/"+strings.Repeat("a", 64), nil)
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", resp.StatusCode)
	}
}

func TestHandleObjectMissingID(t *testing.T) {
	t.Parallel()

	client, stop := newTestServer(t)
	defer stop()

	req, _ := http.NewRequestWithContext(context.Background(), http.MethodGet, "http://unix/internal/v1/objects/", nil)
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", resp.StatusCode)
	}
}

func TestHandleObjectMethodNotAllowed(t *testing.T) {
	t.Parallel()

	client, stop := newTestServer(t)
	defer stop()

	req, _ := http.NewRequestWithContext(context.Background(), http.MethodPost, "http://unix/internal/v1/objects/"+strings.Repeat("a", 64), nil)
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusMethodNotAllowed {
		t.Fatalf("expected 405, got %d", resp.StatusCode)
	}
}

func TestHandleChunkStatusFound(t *testing.T) {
	t.Parallel()

	client, stop := newTestServer(t)
	defer stop()

	// Upload first to get a real chunk hash
	content := bytes.Repeat([]byte("chunk-status-test-"), 1024)
	uploadReq, _ := http.NewRequestWithContext(context.Background(), http.MethodPost, "http://unix/internal/v1/uploads", bytes.NewReader(content))
	uploadResp, err := client.Do(uploadReq)
	if err != nil || uploadResp.StatusCode != http.StatusCreated {
		t.Fatalf("upload failed: err=%v status=%d", err, uploadResp.StatusCode)
	}

	var uploadPayload struct {
		UploadCommitResult struct {
			ManifestID string `json:"manifest_id"`
		} `json:"upload_commit_result"`
	}
	if err := json.NewDecoder(uploadResp.Body).Decode(&uploadPayload); err != nil {
		t.Fatalf("decode upload: %v", err)
	}
	uploadResp.Body.Close()

	// Get the manifest to find a chunk hash
	manifestReq, _ := http.NewRequestWithContext(context.Background(), http.MethodGet, "http://unix/internal/v1/manifests/"+uploadPayload.UploadCommitResult.ManifestID, nil)
	manifestResp, err := client.Do(manifestReq)
	if err != nil || manifestResp.StatusCode != http.StatusOK {
		t.Fatalf("manifest fetch failed: err=%v status=%d", err, manifestResp.StatusCode)
	}

	var manifestPayload struct {
		ManifestRecord struct {
			ChunkHashes []string `json:"chunk_hashes"`
		} `json:"manifest_record"`
	}
	if err := json.NewDecoder(manifestResp.Body).Decode(&manifestPayload); err != nil {
		t.Fatalf("decode manifest: %v", err)
	}
	manifestResp.Body.Close()

	if len(manifestPayload.ManifestRecord.ChunkHashes) == 0 {
		t.Fatal("expected at least one chunk hash")
	}

	chunkHash := manifestPayload.ManifestRecord.ChunkHashes[0]
	req, _ := http.NewRequestWithContext(context.Background(), http.MethodGet, "http://unix/internal/v1/chunks/"+chunkHash+"/status", nil)
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("chunk status request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	var payload struct {
		Exists bool `json:"exists"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode chunk status: %v", err)
	}
	if !payload.Exists {
		t.Fatal("expected chunk to exist")
	}
}

func TestHandleChunkStatusNotFound(t *testing.T) {
	t.Parallel()

	client, stop := newTestServer(t)
	defer stop()

	unknownHash := strings.Repeat("e", 64)
	req, _ := http.NewRequestWithContext(context.Background(), http.MethodGet, "http://unix/internal/v1/chunks/"+unknownHash+"/status", nil)
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 (exists=false), got %d", resp.StatusCode)
	}

	var payload struct {
		Exists bool `json:"exists"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if payload.Exists {
		t.Fatal("expected exists=false for unknown chunk")
	}
}

func TestHandleChunkStatusMissingHash(t *testing.T) {
	t.Parallel()

	client, stop := newTestServer(t)
	defer stop()

	req, _ := http.NewRequestWithContext(context.Background(), http.MethodGet, "http://unix/internal/v1/chunks//status", nil)
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", resp.StatusCode)
	}
}

func TestHandleChunkStatusInvalidPath(t *testing.T) {
	t.Parallel()

	client, stop := newTestServer(t)
	defer stop()

	req, _ := http.NewRequestWithContext(context.Background(), http.MethodGet, "http://unix/internal/v1/chunks/somehash/notstatus", nil)
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", resp.StatusCode)
	}
}

func TestHandleChunkStatusMethodNotAllowed(t *testing.T) {
	t.Parallel()

	client, stop := newTestServer(t)
	defer stop()

	req, _ := http.NewRequestWithContext(context.Background(), http.MethodPost, "http://unix/internal/v1/chunks/"+strings.Repeat("a", 64)+"/status", nil)
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusMethodNotAllowed {
		t.Fatalf("expected 405, got %d", resp.StatusCode)
	}
}
