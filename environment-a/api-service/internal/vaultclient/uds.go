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
