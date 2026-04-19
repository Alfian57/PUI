package uds

import (
	"context"
	"encoding/json"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/alfiang/pui/environment-b/vault-core/internal/config"
	"github.com/dgraph-io/badger/v4"
)

func TestUDSHealthAndForbiddenOperation(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	socketPath := filepath.Join(root, "vault-core.sock")
	badgerPath := filepath.Join(root, "badger")
	chunkRoot := filepath.Join(root, "chunks")

	opts := badger.DefaultOptions(badgerPath)
	opts.Logger = nil

	db, err := badger.Open(opts)
	if err != nil {
		t.Fatalf("open badger: %v", err)
	}
	t.Cleanup(func() {
		_ = db.Close()
	})

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
		t.Fatalf("listen uds: %v", err)
	}
	t.Cleanup(func() {
		_ = listener.Close()
	})

	server := &http.Server{
		Handler: h,
		ConnContext: func(ctx context.Context, c net.Conn) context.Context {
			return context.WithValue(ctx, connContextKey{}, c)
		},
	}
	t.Cleanup(func() {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		_ = server.Shutdown(ctx)
	})

	go func() {
		_ = server.Serve(listener)
	}()

	client := &http.Client{
		Timeout: 3 * time.Second,
		Transport: &http.Transport{
			DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
				return new(net.Dialer).DialContext(ctx, "unix", socketPath)
			},
		},
	}

	t.Run("health over uds", func(t *testing.T) {
		req, err := http.NewRequestWithContext(context.Background(), http.MethodGet, "http://unix/internal/v1/health", nil)
		if err != nil {
			t.Fatalf("build health request: %v", err)
		}

		resp, err := client.Do(req)
		if err != nil {
			t.Fatalf("do health request: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			t.Fatalf("unexpected status code: %d", resp.StatusCode)
		}
	})

	t.Run("destructive manifest method rejected", func(t *testing.T) {
		manifestID := "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
		req, err := http.NewRequestWithContext(context.Background(), http.MethodDelete, "http://unix/internal/v1/manifests/"+manifestID, nil)
		if err != nil {
			t.Fatalf("build delete request: %v", err)
		}

		resp, err := client.Do(req)
		if err != nil {
			t.Fatalf("do delete request: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusForbidden {
			t.Fatalf("expected 403, got %d", resp.StatusCode)
		}

		var payload struct {
			Status string `json:"status"`
			Error  struct {
				Code string `json:"code"`
			} `json:"error"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
			t.Fatalf("decode response: %v", err)
		}

		if payload.Error.Code != "operation_forbidden" {
			t.Fatalf("unexpected error code: %s", payload.Error.Code)
		}
	})
}
