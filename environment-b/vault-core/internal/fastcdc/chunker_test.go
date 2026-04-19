package fastcdc

import (
	"bytes"
	"context"
	"testing"
)

func TestSplitSmallFileSingleChunk(t *testing.T) {
	t.Parallel()

	input := []byte("small-file-content")
	chunks, err := collectChunks(input, Config{MinSize: 64, AvgSize: 128, MaxSize: 256})
	if err != nil {
		t.Fatalf("split: %v", err)
	}

	if len(chunks) != 1 {
		t.Fatalf("expected 1 chunk, got %d", len(chunks))
	}

	if !bytes.Equal(chunks[0], input) {
		t.Fatalf("single chunk payload mismatch")
	}
}

func TestSplitKeepsChunkBoundaries(t *testing.T) {
	t.Parallel()

	input := bytes.Repeat([]byte("abcdefghijklmnopqrstuvwxyz012345"), 2048)
	cfg := Config{MinSize: 4 * 1024, AvgSize: 8 * 1024, MaxSize: 16 * 1024}

	chunks, err := collectChunks(input, cfg)
	if err != nil {
		t.Fatalf("split: %v", err)
	}

	if len(chunks) < 2 {
		t.Fatalf("expected multiple chunks, got %d", len(chunks))
	}

	for i := 0; i < len(chunks)-1; i++ {
		size := len(chunks[i])
		if size < cfg.MinSize {
			t.Fatalf("chunk %d below min size: %d", i, size)
		}
		if size > cfg.MaxSize {
			t.Fatalf("chunk %d above max size: %d", i, size)
		}
	}

	if len(chunks[len(chunks)-1]) > cfg.MaxSize {
		t.Fatalf("last chunk above max size: %d", len(chunks[len(chunks)-1]))
	}
}

func TestSplitLargeFileReassembles(t *testing.T) {
	t.Parallel()

	input := make([]byte, 2*1024*1024)
	for i := range input {
		input[i] = byte(i % 251)
	}

	chunks, err := collectChunks(input, Config{MinSize: 32 * 1024, AvgSize: 64 * 1024, MaxSize: 128 * 1024})
	if err != nil {
		t.Fatalf("split: %v", err)
	}

	if len(chunks) < 4 {
		t.Fatalf("expected at least 4 chunks for large file, got %d", len(chunks))
	}

	rebuilt := bytes.Join(chunks, nil)
	if !bytes.Equal(rebuilt, input) {
		t.Fatalf("reassembled bytes mismatch")
	}
}

func TestSplitDistributionReasonable(t *testing.T) {
	t.Parallel()

	input := make([]byte, 6*1024*1024)
	for i := range input {
		input[i] = byte((i*17 + 29) % 251)
	}

	cfg := Config{MinSize: 4 * 1024, AvgSize: 8 * 1024, MaxSize: 16 * 1024}
	chunks, err := collectChunks(input, cfg)
	if err != nil {
		t.Fatalf("split: %v", err)
	}

	if len(chunks) < 16 {
		t.Fatalf("expected enough chunks for distribution check, got %d", len(chunks))
	}

	total := 0
	for _, chunk := range chunks {
		total += len(chunk)
	}

	avg := float64(total) / float64(len(chunks))
	minExpected := float64(cfg.AvgSize) * 0.5
	maxExpected := float64(cfg.AvgSize) * 1.8

	if avg < minExpected || avg > maxExpected {
		t.Fatalf("average chunk size %.2f out of range [%.2f, %.2f]", avg, minExpected, maxExpected)
	}
}

func collectChunks(input []byte, cfg Config) ([][]byte, error) {
	out := make(chan Chunk, 8)
	errCh := make(chan error, 1)

	go func() {
		defer close(out)
		errCh <- Split(context.Background(), bytes.NewReader(input), cfg, out)
	}()

	chunks := make([][]byte, 0, 16)
	for ch := range out {
		data := make([]byte, len(ch.Bytes))
		copy(data, ch.Bytes)
		chunks = append(chunks, data)
	}

	if err := <-errCh; err != nil {
		return nil, err
	}

	return chunks, nil
}
