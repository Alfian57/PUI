package vaultclient

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type Client struct {
	httpClient *http.Client
	socketPath string
}

type UploadCommitResult struct {
	ManifestID      string  `json:"manifest_id"`
	FileHash        string  `json:"file_hash"`
	TotalSizeBytes  int64   `json:"total_size_bytes"`
	ChunkCount      int     `json:"chunk_count"`
	DedupRatio      float64 `json:"dedup_ratio"`
	Immutable       bool    `json:"immutable"`
	NewChunkCount   int     `json:"new_chunk_count"`
	ReuseChunkCount int     `json:"reuse_chunk_count"`
}

type ManifestRecord struct {
	ManifestID     string    `json:"manifest_id"`
	FileHash       string    `json:"file_hash"`
	ChunkHashes    []string  `json:"chunk_hashes"`
	TotalSizeBytes int64     `json:"total_size_bytes"`
	ChunkCount     int       `json:"chunk_count"`
	CreatedAt      time.Time `json:"created_at"`
	Immutable      bool      `json:"immutable"`
}

type ChunkRecord struct {
	ChunkHash        string    `json:"chunk_hash"`
	SizeBytes        int64     `json:"size_bytes"`
	StoragePath      string    `json:"storage_path"`
	ManifestRefCount int       `json:"manifest_ref_count"`
	Retained         bool      `json:"retained"`
	CreatedAt        time.Time `json:"created_at"`
}

type ChunkStatusResponse struct {
	Status      string      `json:"status"`
	ChunkHash   string      `json:"chunk_hash"`
	Exists      bool        `json:"exists"`
	ChunkRecord ChunkRecord `json:"chunk_record"`
}

func New(socketPath string) *Client {
	transport := &http.Transport{
		DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
			dialer := &net.Dialer{}
			return dialer.DialContext(ctx, "unix", socketPath)
		},
	}

	return &Client{
		httpClient: &http.Client{
			Transport: transport,
		},
		socketPath: socketPath,
	}
}

func (c *Client) Health(ctx context.Context) (map[string]any, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "http://unix/internal/v1/health", nil)
	if err != nil {
		return nil, fmt.Errorf("build uds request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("call vault health over uds %s: %w", c.socketPath, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("vault health returned status %d", resp.StatusCode)
	}

	var payload map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, fmt.Errorf("decode vault health response: %w", err)
	}

	return payload, nil
}

func (c *Client) Upload(ctx context.Context, fileName string, reader io.Reader) (UploadCommitResult, error) {
	requestURL := "http://unix/internal/v1/uploads"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, requestURL, reader)
	if err != nil {
		return UploadCommitResult{}, fmt.Errorf("build upload request: %w", err)
	}

	if fileName != "" {
		req.Header.Set("X-File-Name", fileName)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return UploadCommitResult{}, fmt.Errorf("call vault upload over uds %s: %w", c.socketPath, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		message, readErr := io.ReadAll(io.LimitReader(resp.Body, 8*1024))
		if readErr != nil {
			return UploadCommitResult{}, fmt.Errorf("vault upload returned status %d", resp.StatusCode)
		}

		return UploadCommitResult{}, fmt.Errorf("vault upload returned status %d: %s", resp.StatusCode, strings.TrimSpace(string(message)))
	}

	var payload struct {
		Status             string             `json:"status"`
		UploadCommitResult UploadCommitResult `json:"upload_commit_result"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return UploadCommitResult{}, fmt.Errorf("decode upload response: %w", err)
	}

	return payload.UploadCommitResult, nil
}

func (c *Client) GetManifest(ctx context.Context, manifestID string) (ManifestRecord, error) {
	requestURL := fmt.Sprintf("http://unix/internal/v1/manifests/%s", url.PathEscape(manifestID))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
	if err != nil {
		return ManifestRecord{}, fmt.Errorf("build manifest request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return ManifestRecord{}, fmt.Errorf("call vault manifest over uds %s: %w", c.socketPath, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		message, readErr := io.ReadAll(io.LimitReader(resp.Body, 8*1024))
		if readErr != nil {
			return ManifestRecord{}, fmt.Errorf("vault manifest returned status %d", resp.StatusCode)
		}

		return ManifestRecord{}, fmt.Errorf("vault manifest returned status %d: %s", resp.StatusCode, strings.TrimSpace(string(message)))
	}

	var payload struct {
		Status         string         `json:"status"`
		ManifestRecord ManifestRecord `json:"manifest_record"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return ManifestRecord{}, fmt.Errorf("decode manifest response: %w", err)
	}

	return payload.ManifestRecord, nil
}

func (c *Client) DownloadObject(ctx context.Context, manifestID string) (io.ReadCloser, int64, error) {
	requestURL := fmt.Sprintf("http://unix/internal/v1/objects/%s", url.PathEscape(manifestID))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
	if err != nil {
		return nil, 0, fmt.Errorf("build object request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, 0, fmt.Errorf("call vault object over uds %s: %w", c.socketPath, err)
	}

	if resp.StatusCode != http.StatusOK {
		defer resp.Body.Close()
		message, readErr := io.ReadAll(io.LimitReader(resp.Body, 8*1024))
		if readErr != nil {
			return nil, 0, fmt.Errorf("vault object returned status %d", resp.StatusCode)
		}

		return nil, 0, fmt.Errorf("vault object returned status %d: %s", resp.StatusCode, strings.TrimSpace(string(message)))
	}

	return resp.Body, resp.ContentLength, nil
}

func (c *Client) GetChunkStatus(ctx context.Context, chunkHash string) (ChunkStatusResponse, error) {
	requestURL := fmt.Sprintf("http://unix/internal/v1/chunks/%s/status", url.PathEscape(chunkHash))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
	if err != nil {
		return ChunkStatusResponse{}, fmt.Errorf("build chunk status request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return ChunkStatusResponse{}, fmt.Errorf("call vault chunk status over uds %s: %w", c.socketPath, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		buf := bytes.NewBuffer(nil)
		_, _ = io.CopyN(buf, resp.Body, 8*1024)
		return ChunkStatusResponse{}, fmt.Errorf("vault chunk status returned status %d: %s", resp.StatusCode, strings.TrimSpace(buf.String()))
	}

	var payload ChunkStatusResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return ChunkStatusResponse{}, fmt.Errorf("decode chunk status response: %w", err)
	}

	return payload, nil
}

// ErrorContract mirrors the structured error body returned by Vault Core when it
// rejects a request. It is used by the Security Lab to surface the exact policy
// response produced by an attempted destructive operation.
type ErrorContract struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Method  string `json:"method,omitempty"`
	Path    string `json:"path,omitempty"`
}

// MutationAttempt captures the full outcome of an attempted destructive request
// against Vault Core: the HTTP status, the parsed structured error (if any) and
// the raw response body. A non-nil error is returned only for transport-level
// failures (the connection could not be made), NOT for a policy rejection such
// as 403 operation_forbidden, which is a successful, expected result.
type MutationAttempt struct {
	Method     string
	Path       string
	StatusCode int
	Error      ErrorContract
	RawBody    string
}

// Blocked reports whether Vault Core rejected the destructive request at the
// protocol level (HTTP 403 with the operation_forbidden contract).
func (m MutationAttempt) Blocked() bool {
	return m.StatusCode == http.StatusForbidden && m.Error.Code == "operation_forbidden"
}

// AttemptManifestMutation sends a destructive HTTP method (DELETE/PUT/PATCH)
// directly to the Vault Core manifest endpoint over UDS, simulating an attacker
// who has reached the storage protocol and tries to delete or overwrite an
// immutable manifest (i.e. a ransomware-style operation). Vault Core is expected
// to reject every such request; this method reports exactly what it returned.
func (c *Client) AttemptManifestMutation(ctx context.Context, method, manifestID string, body []byte) (MutationAttempt, error) {
	path := fmt.Sprintf("/internal/v1/manifests/%s", url.PathEscape(manifestID))
	requestURL := "http://unix" + path

	var reader io.Reader
	if len(body) > 0 {
		reader = bytes.NewReader(body)
	}

	req, err := http.NewRequestWithContext(ctx, method, requestURL, reader)
	if err != nil {
		return MutationAttempt{}, fmt.Errorf("build %s manifest request: %w", method, err)
	}
	if len(body) > 0 {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return MutationAttempt{}, fmt.Errorf("call vault %s manifest over uds %s: %w", method, c.socketPath, err)
	}
	defer resp.Body.Close()

	rawBytes, err := io.ReadAll(io.LimitReader(resp.Body, 8*1024))
	if err != nil {
		return MutationAttempt{}, fmt.Errorf("read vault %s manifest response: %w", method, err)
	}

	attempt := MutationAttempt{
		Method:     method,
		Path:       path,
		StatusCode: resp.StatusCode,
		RawBody:    strings.TrimSpace(string(rawBytes)),
	}

	// The structured error body is nested under the "error" key. A decode failure
	// is non-fatal: we still return the status code and raw body for inspection.
	var envelope struct {
		Status string        `json:"status"`
		Error  ErrorContract `json:"error"`
	}
	if jsonErr := json.Unmarshal(rawBytes, &envelope); jsonErr == nil {
		attempt.Error = envelope.Error
	}

	return attempt, nil
}
