package cas

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/alfiang/pui/environment-b/vault-core/internal/fastcdc"
	"github.com/dgraph-io/badger/v4"
)

func TestProcessUploadCommitsManifestAndChunkMetadata(t *testing.T) {
	t.Parallel()

	store := newTestStore(t)
	ctx := context.Background()

	content := make([]byte, 128*1024)
	for i := range content {
		content[i] = byte(i % 199)
	}

	first, err := store.ProcessUpload(ctx, "fixture.bin", bytes.NewReader(content))
	if err != nil {
		t.Fatalf("first upload: %v", err)
	}

	if first.ChunkCount == 0 {
		t.Fatalf("expected chunk count > 0")
	}

	if first.NewChunkCount == 0 {
		t.Fatalf("expected first upload to write new chunks")
	}

	manifest, err := store.GetManifest(ctx, first.ManifestID)
	if err != nil {
		t.Fatalf("get manifest: %v", err)
	}

	if manifest.ManifestID != first.ManifestID {
		t.Fatalf("manifest id mismatch")
	}

	chunk, found, err := store.GetChunk(ctx, manifest.ChunkHashes[0])
	if err != nil {
		t.Fatalf("get chunk: %v", err)
	}
	if !found {
		t.Fatalf("expected first chunk metadata to exist")
	}
	if chunk.StoragePath == "" {
		t.Fatalf("expected storage path to be set")
	}
}

func TestProcessUploadReusesExistingChunks(t *testing.T) {
	t.Parallel()

	store := newTestStore(t)
	ctx := context.Background()

	content := bytes.Repeat([]byte("dedup-content-block-"), 10*1024)

	first, err := store.ProcessUpload(ctx, "dedup.bin", bytes.NewReader(content))
	if err != nil {
		t.Fatalf("first upload: %v", err)
	}

	second, err := store.ProcessUpload(ctx, "dedup.bin", bytes.NewReader(content))
	if err != nil {
		t.Fatalf("second upload: %v", err)
	}

	if second.NewChunkCount != 0 {
		t.Fatalf("expected 0 new chunks on second upload, got %d", second.NewChunkCount)
	}

	if second.ReuseChunkCount != second.ChunkCount {
		t.Fatalf("expected all chunks to be reused on second upload")
	}

	manifest, err := store.GetManifest(ctx, first.ManifestID)
	if err != nil {
		t.Fatalf("get first manifest: %v", err)
	}

	firstChunk, found, err := store.GetChunk(ctx, manifest.ChunkHashes[0])
	if err != nil {
		t.Fatalf("get chunk after second upload: %v", err)
	}
	if !found {
		t.Fatalf("expected chunk metadata to exist")
	}
	if firstChunk.ManifestRefCount < 2 {
		t.Fatalf("expected manifest_ref_count >= 2, got %d", firstChunk.ManifestRefCount)
	}
}

func TestProcessUploadPartiallyChangedFileReusesUnchangedChunks(t *testing.T) {
	t.Parallel()

	store := newTestStore(t)
	ctx := context.Background()

	original := make([]byte, 256*1024)
	for i := range original {
		original[i] = byte((i*31 + i/7) % 251)
	}

	first, err := store.ProcessUpload(ctx, "backup-v1.bin", bytes.NewReader(original))
	if err != nil {
		t.Fatalf("first upload: %v", err)
	}
	if first.ChunkCount < 2 {
		t.Fatalf("expected multiple chunks for partial-change test, got %d", first.ChunkCount)
	}

	changed := append([]byte(nil), original...)
	for i := len(changed) - 1024; i < len(changed); i++ {
		changed[i] ^= 0x5a
	}

	second, err := store.ProcessUpload(ctx, "backup-v2.bin", bytes.NewReader(changed))
	if err != nil {
		t.Fatalf("second upload: %v", err)
	}

	if second.NewChunkCount == 0 {
		t.Fatalf("expected changed upload to write at least one new chunk")
	}
	if second.ReuseChunkCount == 0 {
		t.Fatalf("expected changed upload to reuse unchanged chunks")
	}
	if second.ReuseChunkCount >= second.ChunkCount {
		t.Fatalf("expected changed upload to be partial reuse, got reused=%d total=%d", second.ReuseChunkCount, second.ChunkCount)
	}
}

func TestProcessUploadRejectsEmptyFileWithoutCommittingManifest(t *testing.T) {
	t.Parallel()

	store := newTestStore(t)
	ctx := context.Background()

	if _, err := store.ProcessUpload(ctx, "empty.bin", bytes.NewReader(nil)); !errors.Is(err, ErrInvalidUpload) {
		t.Fatalf("expected ErrInvalidUpload, got %v", err)
	}

	manifestCount := 0
	err := store.db.View(func(txn *badger.Txn) error {
		it := txn.NewIterator(badger.DefaultIteratorOptions)
		defer it.Close()

		prefix := []byte(manifestPrefix)
		for it.Seek(prefix); it.ValidForPrefix(prefix); it.Next() {
			manifestCount++
		}

		return nil
	})
	if err != nil {
		t.Fatalf("count manifests: %v", err)
	}
	if manifestCount != 0 {
		t.Fatalf("expected 0 committed manifests, got %d", manifestCount)
	}
}

func TestCleanupExpiredUploadSessions(t *testing.T) {
	t.Parallel()

	store := newTestStore(t)
	ctx := context.Background()

	expired := UploadSessionRecord{
		SessionID:      "session-expired",
		FileName:       "expired.bin",
		ReceivedChunks: []string{"a"},
		StartedAt:      time.Now().UTC().Add(-2 * time.Hour),
		ExpiresAt:      time.Now().UTC().Add(-1 * time.Hour),
		State:          "failed",
	}

	notExpired := UploadSessionRecord{
		SessionID:      "session-active",
		FileName:       "active.bin",
		ReceivedChunks: []string{"b"},
		StartedAt:      time.Now().UTC(),
		ExpiresAt:      time.Now().UTC().Add(1 * time.Hour),
		State:          "in_progress",
	}

	if err := store.putUploadSession(ctx, expired); err != nil {
		t.Fatalf("put expired session: %v", err)
	}
	if err := store.putUploadSession(ctx, notExpired); err != nil {
		t.Fatalf("put active session: %v", err)
	}

	deleted, err := store.CleanupExpiredUploadSessions(ctx, time.Now().UTC())
	if err != nil {
		t.Fatalf("cleanup sessions: %v", err)
	}

	if deleted != 1 {
		t.Fatalf("expected 1 deleted session, got %d", deleted)
	}

	err = store.db.View(func(txn *badger.Txn) error {
		if _, err := txn.Get(uploadKey(expired.SessionID)); err == nil {
			return fmt.Errorf("expired session still exists")
		}

		if _, err := txn.Get(uploadKey(notExpired.SessionID)); err != nil {
			return fmt.Errorf("active session missing: %w", err)
		}

		return nil
	})
	if err != nil {
		t.Fatalf("verify sessions: %v", err)
	}
}

func TestGetManifestRejectsInconsistentRecord(t *testing.T) {
	t.Parallel()

	store := newTestStore(t)
	ctx := context.Background()

	manifestID := strings.Repeat("a", 64)
	record := ManifestRecord{
		ManifestID:     manifestID,
		FileHash:       strings.Repeat("b", 64),
		ChunkHashes:    []string{},
		TotalSizeBytes: 0,
		ChunkCount:     0,
		CreatedAt:      time.Now().UTC(),
		Immutable:      true,
	}

	payload, err := json.Marshal(record)
	if err != nil {
		t.Fatalf("marshal inconsistent manifest: %v", err)
	}

	err = store.db.Update(func(txn *badger.Txn) error {
		return txn.Set(manifestKey(manifestID), payload)
	})
	if err != nil {
		t.Fatalf("insert inconsistent manifest: %v", err)
	}

	if _, err := store.GetManifest(ctx, manifestID); err == nil {
		t.Fatalf("expected manifest validation error")
	}
}

func TestProcessUploadFailsWithoutCommittingManifest(t *testing.T) {
	t.Parallel()

	store := newTestStore(t)
	ctx := context.Background()

	_, err := store.ProcessUpload(ctx, "broken.bin", &brokenReader{limit: 16 * 1024})
	if err == nil {
		t.Fatalf("expected upload error")
	}

	manifestCount := 0
	err = store.db.View(func(txn *badger.Txn) error {
		it := txn.NewIterator(badger.DefaultIteratorOptions)
		defer it.Close()

		prefix := []byte(manifestPrefix)
		for it.Seek(prefix); it.ValidForPrefix(prefix); it.Next() {
			manifestCount++
		}

		return nil
	})
	if err != nil {
		t.Fatalf("count manifests: %v", err)
	}

	if manifestCount != 0 {
		t.Fatalf("expected 0 committed manifests, got %d", manifestCount)
	}
}

func TestWriteChunkIfMissingDoesNotOverwriteExistingFile(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	targetPath := filepath.Join(root, "aa", "bb", "chunk.bin")

	first := []byte("first-version")
	second := []byte("second-version")

	if err := writeChunkIfMissing(targetPath, first); err != nil {
		t.Fatalf("write first chunk: %v", err)
	}

	if err := writeChunkIfMissing(targetPath, second); err != nil {
		t.Fatalf("write second chunk: %v", err)
	}

	data, err := os.ReadFile(targetPath)
	if err != nil {
		t.Fatalf("read chunk: %v", err)
	}

	if !bytes.Equal(data, first) {
		t.Fatalf("chunk file was overwritten")
	}
}

type brokenReader struct {
	read  int
	limit int
}

func (b *brokenReader) Read(p []byte) (int, error) {
	if b.read >= b.limit {
		return 0, errors.New("injected stream error")
	}

	remaining := b.limit - b.read
	if remaining < len(p) {
		p = p[:remaining]
	}

	for i := range p {
		p[i] = byte((b.read + i) % 251)
	}

	b.read += len(p)
	if b.read >= b.limit {
		return len(p), io.ErrUnexpectedEOF
	}

	return len(p), nil
}

func newTestStore(t *testing.T) *Store {
	t.Helper()

	root := t.TempDir()
	chunkRoot := filepath.Join(root, "chunks")
	dbPath := filepath.Join(root, "badger")

	opts := badger.DefaultOptions(dbPath)
	opts.Logger = nil

	db, err := badger.Open(opts)
	if err != nil {
		t.Fatalf("open badger: %v", err)
	}

	t.Cleanup(func() {
		_ = db.Close()
	})

	return NewStore(
		db,
		chunkRoot,
		fastcdc.Config{
			MinSize: 2 * 1024,
			AvgSize: 4 * 1024,
			MaxSize: 8 * 1024,
		},
	)
}
