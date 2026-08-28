package uds

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"strings"
	"time"
)

type securityEventClient struct {
	httpClient *http.Client
}

type securityEventPayload struct {
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

func newSecurityEventClient(socketPath string) *securityEventClient {
	transport := &http.Transport{
		DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
			return new(net.Dialer).DialContext(ctx, "unix", socketPath)
		},
	}
	return &securityEventClient{httpClient: &http.Client{Transport: transport, Timeout: 750 * time.Millisecond}}
}

func (c *securityEventClient) Publish(ctx context.Context, payload securityEventPayload) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal security event: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "http://unix/internal/v1/security-events", bytes.NewReader(data))
	if err != nil {
		return fmt.Errorf("build security event request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("publish security event: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusAccepted {
		return fmt.Errorf("security event bridge returned status %d", resp.StatusCode)
	}
	return nil
}

func securityRunIDFromHeader(header string) string {
	return strings.TrimSpace(header)
}
