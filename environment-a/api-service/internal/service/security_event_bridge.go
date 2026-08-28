package service

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
	"time"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"golang.org/x/sys/unix"
)

type securityBridgeConnKey struct{}

// SecurityEventBridge receives policy-denial events from Vault Core over a
// filesystem-only socket. The network-facing API never exposes this handler.
type SecurityEventBridge struct {
	server   *http.Server
	listener net.Listener
	path     string
}

type vaultSecurityEventPayload struct {
	RunID      string         `json:"run_id,omitempty"`
	EventType  string         `json:"event_type"`
	Severity   string         `json:"severity"`
	Outcome    string         `json:"outcome"`
	Method     string         `json:"method"`
	Path       string         `json:"path"`
	StatusCode int            `json:"status_code"`
	ErrorCode  string         `json:"error_code"`
	Details    map[string]any `json:"details,omitempty"`
	OccurredAt time.Time      `json:"occurred_at"`
}

func StartSecurityEventBridge(path string, allowedUIDs []uint32, recorder SecurityEventRecorder) (*SecurityEventBridge, error) {
	if path == "" {
		return nil, fmt.Errorf("security event uds path is required")
	}
	if len(allowedUIDs) == 0 {
		return nil, fmt.Errorf("security event uds allowed uid list must not be empty")
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o770); err != nil {
		return nil, fmt.Errorf("create security event uds parent: %w", err)
	}
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return nil, fmt.Errorf("remove stale security event uds: %w", err)
	}

	listener, err := net.Listen("unix", path)
	if err != nil {
		return nil, fmt.Errorf("listen security event uds: %w", err)
	}
	if err := os.Chmod(path, 0o660); err != nil {
		_ = listener.Close()
		_ = os.Remove(path)
		return nil, fmt.Errorf("chmod security event uds: %w", err)
	}

	allowed := make(map[uint32]struct{}, len(allowedUIDs))
	for _, uid := range allowedUIDs {
		allowed[uid] = struct{}{}
	}
	bridge := &SecurityEventBridge{listener: listener, path: path}
	bridge.server = &http.Server{
		Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			handleVaultSecurityEvent(w, r, allowed, recorder)
		}),
		ConnContext: func(ctx context.Context, conn net.Conn) context.Context {
			return context.WithValue(ctx, securityBridgeConnKey{}, conn)
		},
	}
	go func() {
		if err := bridge.server.Serve(listener); err != nil && err != http.ErrServerClosed {
			log.Printf("event=security_event_bridge_stopped err=%v", err)
		}
	}()
	return bridge, nil
}

func (b *SecurityEventBridge) Close(ctx context.Context) error {
	if b == nil {
		return nil
	}
	err := b.server.Shutdown(ctx)
	if closeErr := b.listener.Close(); err == nil && !errors.Is(closeErr, net.ErrClosed) {
		err = closeErr
	}
	if removeErr := os.Remove(b.path); err == nil && removeErr != nil && !os.IsNotExist(removeErr) {
		err = removeErr
	}
	return err
}

func handleVaultSecurityEvent(w http.ResponseWriter, r *http.Request, allowed map[uint32]struct{}, recorder SecurityEventRecorder) {
	if recorder == nil {
		http.Error(w, "event recorder unavailable", http.StatusServiceUnavailable)
		return
	}
	if r.Method != http.MethodPost || r.URL.Path != "/internal/v1/security-events" {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	conn, ok := r.Context().Value(securityBridgeConnKey{}).(net.Conn)
	if !ok {
		http.Error(w, "peer identity required", http.StatusForbidden)
		return
	}
	uid, err := peerUID(conn)
	if err != nil {
		http.Error(w, "peer identity required", http.StatusForbidden)
		return
	}
	if _, ok := allowed[uid]; !ok {
		http.Error(w, "peer not allowed", http.StatusForbidden)
		return
	}

	var payload vaultSecurityEventPayload
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
	if err := decoder.Decode(&payload); err != nil {
		http.Error(w, "invalid event", http.StatusBadRequest)
		return
	}
	if payload.EventType != domain.SecurityEventVaultPolicyBlocked || payload.Outcome != domain.SecurityOutcomeBlocked {
		http.Error(w, "unsupported event", http.StatusBadRequest)
		return
	}

	_, err = recorder.Record(r.Context(), domain.SecurityEventInput{
		RunID: payload.RunID, EventType: payload.EventType, Source: domain.SecuritySourceVault,
		Severity: payload.Severity, Outcome: payload.Outcome, Method: payload.Method,
		Path: payload.Path, StatusCode: payload.StatusCode, ErrorCode: payload.ErrorCode,
		Details: payload.Details, OccurredAt: payload.OccurredAt,
	})
	if err != nil {
		log.Printf("event=security_event_bridge_record_failed uid=%d err=%v", uid, err)
		http.Error(w, "event unavailable", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusAccepted)
}

func peerUID(conn net.Conn) (uint32, error) {
	unixConn, ok := conn.(*net.UnixConn)
	if !ok {
		return 0, fmt.Errorf("connection is not unix")
	}
	rawConn, err := unixConn.SyscallConn()
	if err != nil {
		return 0, err
	}
	var credential *unix.Ucred
	var controlErr error
	if err := rawConn.Control(func(fd uintptr) {
		credential, controlErr = unix.GetsockoptUcred(int(fd), unix.SOL_SOCKET, unix.SO_PEERCRED)
	}); err != nil {
		return 0, err
	}
	if controlErr != nil || credential == nil {
		if controlErr != nil {
			return 0, controlErr
		}
		return 0, fmt.Errorf("empty peer credentials")
	}
	return credential.Uid, nil
}
