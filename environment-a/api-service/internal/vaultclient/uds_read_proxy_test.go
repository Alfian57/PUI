package vaultclient

import (
	"context"
	"io"
	"net"
	"net/http"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestDownloadObjectUsesReadProxyEndpoint(t *testing.T) {
	t.Parallel()

	socketPath := filepath.Join(t.TempDir(), "vault-core.sock")
	listener, err := net.Listen("unix", socketPath)
	if err != nil {
		t.Fatalf("listen uds: %v", err)
	}

	manifestID := strings.Repeat("a", 64)
	wantPath := "/internal/v1/read-proxy/objects/" + manifestID
	content := "proxied-content"
	server := &http.Server{Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != wantPath {
			http.Error(w, "unexpected path", http.StatusBadRequest)
			return
		}
		w.Header().Set("Content-Length", "15")
		_, _ = io.WriteString(w, content)
	})}
	go func() { _ = server.Serve(listener) }()
	t.Cleanup(func() {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		_ = server.Shutdown(ctx)
		_ = listener.Close()
	})

	body, contentLength, err := New(socketPath).DownloadObject(context.Background(), manifestID)
	if err != nil {
		t.Fatalf("download through read-proxy: %v", err)
	}
	defer body.Close()

	data, err := io.ReadAll(body)
	if err != nil {
		t.Fatalf("read proxied content: %v", err)
	}
	if string(data) != content {
		t.Fatalf("unexpected proxied content: %q", data)
	}
	if contentLength != int64(len(content)) {
		t.Fatalf("unexpected content length: %d", contentLength)
	}
}
