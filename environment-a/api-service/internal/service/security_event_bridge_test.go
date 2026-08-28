package service

import (
	"bytes"
	"context"
	"encoding/json"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
)

func TestSecurityEventBridgeAcceptsVaultPeer(t *testing.T) {
	sink := &bridgeRecorder{}
	socketPath := filepath.Join(t.TempDir(), "security-events.sock")
	bridge, err := StartSecurityEventBridge(socketPath, []uint32{uint32(os.Getuid())}, sink)
	if err != nil {
		t.Fatalf("start bridge: %v", err)
	}
	t.Cleanup(func() { _ = bridge.Close(context.Background()) })

	client := unixHTTPClient(socketPath)
	payload, _ := json.Marshal(map[string]any{
		"event_type": "VAULT_OPERATION_BLOCKED", "severity": "high", "outcome": "blocked",
		"method": "DELETE", "path": "/internal/v1/manifests/demo", "status_code": 403,
		"error_code": "operation_forbidden", "details": map[string]any{"peer_uid": os.Getuid()},
	})
	req, err := http.NewRequest(http.MethodPost, "http://unix/internal/v1/security-events", bytes.NewReader(payload))
	if err != nil {
		t.Fatalf("build bridge request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("send bridge request: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusAccepted {
		t.Fatalf("expected 202, got %d", resp.StatusCode)
	}
	if len(sink.inputs) != 1 || sink.inputs[0].EventType != domain.SecurityEventVaultPolicyBlocked {
		t.Fatalf("expected persisted vault event, got %+v", sink.inputs)
	}
}

func TestSecurityEventBridgeRejectsUnexpectedPeerUID(t *testing.T) {
	sink := &bridgeRecorder{}
	socketPath := filepath.Join(t.TempDir(), "security-events.sock")
	deniedUID := uint32(os.Getuid()) + 1
	bridge, err := StartSecurityEventBridge(socketPath, []uint32{deniedUID}, sink)
	if err != nil {
		t.Fatalf("start bridge: %v", err)
	}
	t.Cleanup(func() { _ = bridge.Close(context.Background()) })

	client := unixHTTPClient(socketPath)
	req, _ := http.NewRequest(http.MethodPost, "http://unix/internal/v1/security-events", bytes.NewReader([]byte(`{"event_type":"VAULT_OPERATION_BLOCKED","outcome":"blocked"}`)))
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("send bridge request: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusForbidden || len(sink.inputs) != 0 {
		t.Fatalf("expected rejected peer, status=%d inputs=%d", resp.StatusCode, len(sink.inputs))
	}
}

type bridgeRecorder struct {
	inputs []domain.SecurityEventInput
}

func (r *bridgeRecorder) Record(_ context.Context, input domain.SecurityEventInput) (domain.SecurityEventRecord, error) {
	r.inputs = append(r.inputs, input)
	return domain.SecurityEventRecord{ID: "bridge-event"}, nil
}

func unixHTTPClient(socketPath string) *http.Client {
	return &http.Client{Timeout: time.Second, Transport: &http.Transport{DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
		return new(net.Dialer).DialContext(ctx, "unix", socketPath)
	}}}
}
