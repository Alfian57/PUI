package uds

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"

	"github.com/alfiang/pui/environment-b/vault-core/internal/cas"
	"github.com/alfiang/pui/environment-b/vault-core/internal/config"
	"github.com/alfiang/pui/environment-b/vault-core/internal/fastcdc"
	"github.com/dgraph-io/badger/v4"
	"golang.org/x/sys/unix"
)

type handler struct {
	cfg            config.Config
	store          *cas.Store
	stats          *metrics
	allowedPeerUID map[uint32]struct{}
}

type metrics struct {
	UploadedFiles uint64
	NewChunks     uint64
	ReuseChunks   uint64
}

func NewHandler(cfg config.Config, db *badger.DB) http.Handler {
	store := cas.NewStore(
		db,
		cfg.ChunkRoot,
		fastcdc.Config{
			MinSize: cfg.FastCDCMinChunkSize,
			AvgSize: cfg.FastCDCAvgChunkSize,
			MaxSize: cfg.FastCDCMaxChunkSize,
		},
	)

	h := handler{
		cfg:            cfg,
		store:          store,
		stats:          &metrics{},
		allowedPeerUID: makeAllowedPeerSet(cfg.UDSAllowedUIDs),
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/internal/v1/health", h.handleHealth)
	mux.HandleFunc("/internal/v1/uploads", h.handleUpload)
	mux.HandleFunc("/internal/v1/manifests/", h.handleManifest)
	mux.HandleFunc("/internal/v1/chunks/", h.handleChunkStatus)

	return h.withPeerCredentialAuth(mux)
}

type connContextKey struct{}

func ListenAndServe(cfg config.Config, handler http.Handler) error {
	socketPath := cfg.UDSPath

	if err := os.MkdirAll(filepath.Dir(socketPath), 0o770); err != nil {
		return fmt.Errorf("create uds parent: %w", err)
	}

	if err := os.RemoveAll(socketPath); err != nil {
		return fmt.Errorf("cleanup stale uds path: %w", err)
	}

	listener, err := net.Listen("unix", socketPath)
	if err != nil {
		return fmt.Errorf("listen on uds: %w", err)
	}
	defer listener.Close()

	if err := os.Chmod(socketPath, 0o660); err != nil {
		return fmt.Errorf("chmod uds path: %w", err)
	}

	if err := os.Chown(socketPath, cfg.UDSOwnerUID, cfg.UDSOwnerGID); err != nil {
		if os.Geteuid() == cfg.UDSOwnerUID && os.Getegid() == cfg.UDSOwnerGID && errors.Is(err, unix.EPERM) {
			// Non-root process may be unable to chown even if target owner matches current process identity.
		} else {
			return fmt.Errorf("chown uds path: %w", err)
		}
	}

	server := &http.Server{
		Handler: handler,
		ConnContext: func(ctx context.Context, c net.Conn) context.Context {
			return context.WithValue(ctx, connContextKey{}, c)
		},
	}

	return server.Serve(listener)
}

func (h handler) handleHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"status":              "ok",
		"environment":         h.cfg.AppEnv,
		"uploaded_files":      atomic.LoadUint64(&h.stats.UploadedFiles),
		"new_chunks_total":    atomic.LoadUint64(&h.stats.NewChunks),
		"reused_chunks_total": atomic.LoadUint64(&h.stats.ReuseChunks),
	})
}

func (h handler) handleUpload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		if isDestructiveMethod(r.Method) {
			writeForbiddenOperation(w, r.Method, r.URL.Path)
			return
		}

		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	defer r.Body.Close()

	fileName := strings.TrimSpace(r.Header.Get("X-File-Name"))
	result, err := h.store.ProcessUpload(r.Context(), fileName, r.Body)
	if err != nil {
		log.Printf("event=upload_failed method=%s path=%s error=%v", r.Method, r.URL.Path, err)

		writeJSON(w, statusCodeFromError(err), map[string]any{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}

	atomic.AddUint64(&h.stats.UploadedFiles, 1)
	atomic.AddUint64(&h.stats.NewChunks, uint64(result.NewChunkCount))
	atomic.AddUint64(&h.stats.ReuseChunks, uint64(result.ReuseChunkCount))

	log.Printf(
		"event=upload_committed manifest_id=%s file_hash=%s chunk_count=%d new_chunks=%d reused_chunks=%d dedup_ratio=%.6f",
		result.ManifestID,
		result.FileHash,
		result.ChunkCount,
		result.NewChunkCount,
		result.ReuseChunkCount,
		result.DedupRatio,
	)

	writeJSON(w, http.StatusCreated, map[string]any{
		"status":               "committed",
		"upload_commit_result": result,
	})
}

func (h handler) handleManifest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		if isDestructiveMethod(r.Method) {
			writeForbiddenOperation(w, r.Method, r.URL.Path)
			return
		}

		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	manifestID := strings.TrimPrefix(r.URL.Path, "/internal/v1/manifests/")
	if manifestID == "" {
		http.Error(w, "manifest id is required", http.StatusBadRequest)
		return
	}

	manifest, err := h.store.GetManifest(r.Context(), manifestID)
	if err != nil {
		writeJSON(w, statusCodeFromError(err), map[string]any{
			"status":      "error",
			"manifest_id": manifestID,
			"error":       err.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"status":          "ok",
		"manifest_record": manifest,
	})
}

func (h handler) handleChunkStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		if isDestructiveMethod(r.Method) {
			writeForbiddenOperation(w, r.Method, r.URL.Path)
			return
		}

		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	chunkPath := strings.TrimPrefix(r.URL.Path, "/internal/v1/chunks/")
	if !strings.HasSuffix(chunkPath, "/status") {
		http.Error(w, "invalid chunk status path", http.StatusBadRequest)
		return
	}

	chunkHash := strings.TrimSuffix(chunkPath, "/status")
	chunkHash = strings.Trim(chunkHash, "/")
	if chunkHash == "" {
		http.Error(w, "chunk hash is required", http.StatusBadRequest)
		return
	}

	record, found, err := h.store.GetChunk(r.Context(), chunkHash)
	if err != nil {
		writeJSON(w, statusCodeFromError(err), map[string]any{
			"status":     "error",
			"chunk_hash": chunkHash,
			"error":      err.Error(),
		})
		return
	}

	if !found {
		writeJSON(w, http.StatusOK, map[string]any{
			"status":     "ok",
			"chunk_hash": chunkHash,
			"exists":     false,
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"status":       "ok",
		"chunk_hash":   chunkHash,
		"exists":       true,
		"chunk_record": record,
	})
}

func statusCodeFromError(err error) int {
	if errors.Is(err, cas.ErrInvalidHash) || errors.Is(err, cas.ErrInvalidUpload) {
		return http.StatusBadRequest
	}

	if errors.Is(err, cas.ErrNotFound) {
		return http.StatusNotFound
	}

	if errors.Is(err, net.ErrClosed) {
		return http.StatusServiceUnavailable
	}

	return http.StatusInternalServerError
}

func isDestructiveMethod(method string) bool {
	switch method {
	case http.MethodDelete, http.MethodPut, http.MethodPatch:
		return true
	default:
		return false
	}
}

func writeForbiddenOperation(w http.ResponseWriter, method, path string) {
	writeJSON(w, http.StatusForbidden, map[string]any{
		"status": "error",
		"error": map[string]any{
			"code":    "operation_forbidden",
			"message": "immutable vault menolak operasi destruktif",
			"method":  method,
			"path":    path,
		},
	})
}

func makeAllowedPeerSet(values []uint32) map[uint32]struct{} {
	if len(values) == 0 {
		return nil
	}

	set := make(map[uint32]struct{}, len(values))
	for _, value := range values {
		set[value] = struct{}{}
	}

	return set
}

func (h handler) withPeerCredentialAuth(next http.Handler) http.Handler {
	if len(h.allowedPeerUID) == 0 {
		return next
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		uid, err := peerUIDFromRequest(r)
		if err != nil {
			writeJSON(w, http.StatusForbidden, map[string]any{
				"status": "error",
				"error": map[string]any{
					"code":    "peer_identity_required",
					"message": "gagal memverifikasi identitas peer UDS",
				},
			})
			return
		}

		if _, allowed := h.allowedPeerUID[uid]; !allowed {
			writeJSON(w, http.StatusForbidden, map[string]any{
				"status": "error",
				"error": map[string]any{
					"code":    "peer_not_allowed",
					"message": "identitas peer UDS tidak diizinkan",
				},
			})
			return
		}

		next.ServeHTTP(w, r)
	})
}

func peerUIDFromRequest(r *http.Request) (uint32, error) {
	conn, ok := r.Context().Value(connContextKey{}).(net.Conn)
	if !ok || conn == nil {
		return 0, fmt.Errorf("missing unix connection from context")
	}

	unixConn, ok := conn.(*net.UnixConn)
	if !ok {
		return 0, fmt.Errorf("unexpected connection type: %T", conn)
	}

	rawConn, err := unixConn.SyscallConn()
	if err != nil {
		return 0, fmt.Errorf("obtain raw connection: %w", err)
	}

	var uid uint32
	var controlErr error
	err = rawConn.Control(func(fd uintptr) {
		cred, credErr := unix.GetsockoptUcred(int(fd), unix.SOL_SOCKET, unix.SO_PEERCRED)
		if credErr != nil {
			controlErr = credErr
			return
		}

		uid = cred.Uid
	})
	if err != nil {
		return 0, fmt.Errorf("read peer credential: %w", err)
	}
	if controlErr != nil {
		return 0, fmt.Errorf("read peer credential: %w", controlErr)
	}

	return uid, nil
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
