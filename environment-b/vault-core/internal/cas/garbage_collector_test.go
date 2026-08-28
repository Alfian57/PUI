package cas

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/dgraph-io/badger/v4"
)

func TestCollectGarbageUsesManifestReferencesAndPreservesActiveObject(t *testing.T) {
	t.Parallel()

	store := newTestStore(t)
	ctx := context.Background()
	content := bytes.Repeat([]byte("active-object-"), 12*1024)

	upload, err := store.ProcessUpload(ctx, "active.bin", bytes.NewReader(content))
	if err != nil {
		t.Fatalf("upload: %v", err)
	}
	manifest, err := store.GetManifest(ctx, upload.ManifestID)
	if err != nil {
		t.Fatalf("get manifest: %v", err)
	}

	// Deliberately stale the denormalized counters. The manifest scan must
	// still protect every chunk required to reconstruct the active object.
	for _, chunkHash := range manifest.ChunkHashes {
		chunk, found, err := store.GetChunk(ctx, chunkHash)
		if err != nil || !found {
			t.Fatalf("get referenced chunk %s: found=%v err=%v", chunkHash, found, err)
		}
		chunk.ManifestRefCount = 0
		chunk.Retained = false
		if err := store.putChunk(ctx, chunk); err != nil {
			t.Fatalf("stale chunk ref count: %v", err)
		}
	}

	orphanHash := strings.Repeat("b", 64)
	createOldChunk(t, store, orphanHash, []byte("orphan"), time.Now().UTC().Add(-2*time.Hour))

	report, err := store.CollectGarbage(ctx, time.Now().UTC().Add(-time.Hour))
	if err != nil {
		t.Fatalf("collect garbage: %v", err)
	}
	if report.DeletedChunks != 1 {
		t.Fatalf("expected one deleted orphan chunk, got %d", report.DeletedChunks)
	}

	if _, found, err := store.GetChunk(ctx, orphanHash); err != nil || found {
		t.Fatalf("orphan metadata still exists: found=%v err=%v", found, err)
	}

	body, _, err := store.OpenObject(ctx, upload.ManifestID)
	if err != nil {
		t.Fatalf("open active object after gc: %v", err)
	}
	defer body.Close()
	reconstructed, err := io.ReadAll(body)
	if err != nil {
		t.Fatalf("read active object after gc: %v", err)
	}
	if !bytes.Equal(reconstructed, content) {
		t.Fatalf("active object changed after gc")
	}
}

func TestCollectGarbageSkipsActiveUploadChunk(t *testing.T) {
	t.Parallel()

	store := newTestStore(t)
	ctx := context.Background()
	chunkHash := strings.Repeat("c", 64)
	createOldChunk(t, store, chunkHash, []byte("active-upload-chunk"), time.Now().UTC().Add(-2*time.Hour))

	store.registerActiveUpload("upload-in-progress")
	store.markActiveUploadChunk("upload-in-progress", chunkHash)

	report, err := store.CollectGarbage(ctx, time.Now().UTC().Add(-time.Hour))
	if err != nil {
		t.Fatalf("collect active garbage: %v", err)
	}
	if report.DeletedChunks != 0 {
		t.Fatalf("active upload chunk was deleted")
	}
	if report.SkippedActiveChunks == 0 {
		t.Fatalf("expected active upload chunk to be reported as skipped")
	}
	assertChunkExists(t, store, chunkHash)

	store.unregisterActiveUpload("upload-in-progress")
	report, err = store.CollectGarbage(ctx, time.Now().UTC().Add(-time.Hour))
	if err != nil {
		t.Fatalf("collect inactive garbage: %v", err)
	}
	if report.DeletedChunks != 1 {
		t.Fatalf("expected inactive chunk to be deleted, got %d", report.DeletedChunks)
	}
	assertChunkMissing(t, store, chunkHash)
}

func TestCollectGarbageRunsWhileUploadIsInProgress(t *testing.T) {
	t.Parallel()

	store := newTestStore(t)
	releaseReader := make(chan struct{})
	uploadDone := make(chan error, 1)
	reader := &pauseAfterFirstReadReader{release: releaseReader}

	go func() {
		_, err := store.ProcessUpload(context.Background(), "concurrent.bin", reader)
		uploadDone <- err
	}()

	var activeHash string
	deadline := time.NewTimer(2 * time.Second)
	defer deadline.Stop()
	for activeHash == "" {
		active := store.snapshotActiveChunkHashes()
		for hash := range active {
			activeHash = hash
			break
		}
		if activeHash != "" {
			break
		}

		select {
		case err := <-uploadDone:
			t.Fatalf("upload completed before gc check: %v", err)
		case <-deadline.C:
			t.Fatal("timed out waiting for active upload chunk")
		case <-time.After(time.Millisecond):
		}
	}

	report, err := store.CollectGarbage(context.Background(), time.Now().UTC().Add(time.Hour))
	if err != nil {
		t.Fatalf("collect concurrent garbage: %v", err)
	}
	if report.DeletedChunks != 0 {
		t.Fatalf("gc deleted chunk from in-progress upload")
	}
	assertChunkExists(t, store, activeHash)

	close(releaseReader)
	select {
	case err := <-uploadDone:
		if err != nil {
			t.Fatalf("upload after gc: %v", err)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for upload completion")
	}
}

func TestCollectGarbageDeletesPhysicalOrphanWithoutMetadata(t *testing.T) {
	t.Parallel()

	store := newTestStore(t)
	ctx := context.Background()
	chunkHash := strings.Repeat("d", 64)
	_, path, err := store.chunkPaths(chunkHash)
	if err != nil {
		t.Fatalf("chunk path: %v", err)
	}
	if err := writeChunkIfMissing(path, []byte("physical orphan")); err != nil {
		t.Fatalf("write physical orphan: %v", err)
	}
	old := time.Now().UTC().Add(-2 * time.Hour)
	if err := os.Chtimes(path, old, old); err != nil {
		t.Fatalf("age physical orphan: %v", err)
	}

	report, err := store.CollectGarbage(ctx, time.Now().UTC().Add(-time.Hour))
	if err != nil {
		t.Fatalf("collect physical orphan: %v", err)
	}
	if report.DeletedPhysicalOrphans != 1 {
		t.Fatalf("expected one physical orphan deletion, got %d", report.DeletedPhysicalOrphans)
	}
	if _, err := os.Stat(path); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("physical orphan still exists, stat error=%v", err)
	}
}

func TestCollectGarbageSkipsFreshChunk(t *testing.T) {
	t.Parallel()

	store := newTestStore(t)
	ctx := context.Background()
	chunkHash := strings.Repeat("e", 64)
	createOldChunk(t, store, chunkHash, []byte("fresh chunk"), time.Now().UTC())

	report, err := store.CollectGarbage(ctx, time.Now().UTC().Add(-time.Hour))
	if err != nil {
		t.Fatalf("collect fresh chunk: %v", err)
	}
	if report.DeletedChunks != 0 {
		t.Fatalf("fresh chunk was deleted")
	}
	assertChunkExists(t, store, chunkHash)
}

func TestCollectGarbageHonorsManifestRetirementGrace(t *testing.T) {
	t.Parallel()

	store := newTestStore(t)
	ctx := context.Background()
	content := bytes.Repeat([]byte("retire-me-"), 4096)
	upload, err := store.ProcessUpload(ctx, "retire.bin", bytes.NewReader(content))
	if err != nil {
		t.Fatalf("upload: %v", err)
	}

	if err := store.RetireManifest(ctx, upload.ManifestID); err != nil {
		t.Fatalf("retire manifest: %v", err)
	}
	manifest, err := store.GetManifest(ctx, upload.ManifestID)
	if err != nil {
		t.Fatalf("get retired manifest: %v", err)
	}
	if !manifest.Retired || manifest.RetiredAt == nil {
		t.Fatalf("expected retired manifest state: %#v", manifest)
	}

	report, err := store.CollectGarbage(ctx, time.Now().UTC().Add(-time.Minute))
	if err != nil {
		t.Fatalf("collect before retirement grace: %v", err)
	}
	if report.DeletedChunks != 0 {
		t.Fatalf("gc deleted chunks before retirement grace: %d", report.DeletedChunks)
	}
	for _, chunkHash := range manifest.ChunkHashes {
		assertChunkExists(t, store, chunkHash)
	}

	report, err = store.CollectGarbage(ctx, time.Now().UTC().Add(time.Minute))
	if err != nil {
		t.Fatalf("collect after retirement grace: %v", err)
	}
	if report.DeletedChunks != len(manifest.ChunkHashes) {
		t.Fatalf("expected all retired chunks deleted, got %d of %d", report.DeletedChunks, len(manifest.ChunkHashes))
	}
}

func TestRetiredManifestCanBeReactivatedByIdenticalUpload(t *testing.T) {
	t.Parallel()

	store := newTestStore(t)
	ctx := context.Background()
	content := bytes.Repeat([]byte("reactivate-me-"), 2048)
	first, err := store.ProcessUpload(ctx, "first.bin", bytes.NewReader(content))
	if err != nil {
		t.Fatalf("first upload: %v", err)
	}
	if err := store.RetireManifest(ctx, first.ManifestID); err != nil {
		t.Fatalf("retire manifest: %v", err)
	}

	second, err := store.ProcessUpload(ctx, "second.bin", bytes.NewReader(content))
	if err != nil {
		t.Fatalf("second upload: %v", err)
	}
	if second.ManifestID != first.ManifestID {
		t.Fatalf("expected deduplicated manifest id %s, got %s", first.ManifestID, second.ManifestID)
	}

	manifest, err := store.GetManifest(ctx, first.ManifestID)
	if err != nil {
		t.Fatalf("get reactivated manifest: %v", err)
	}
	if manifest.Retired {
		t.Fatalf("manifest remained retired after identical upload")
	}

	report, err := store.CollectGarbage(ctx, time.Now().UTC().Add(time.Hour))
	if err != nil {
		t.Fatalf("collect active reactivated manifest: %v", err)
	}
	if report.DeletedChunks != 0 {
		t.Fatalf("gc deleted chunks from reactivated manifest: %d", report.DeletedChunks)
	}
}

func TestRetireManifestIsIdempotent(t *testing.T) {
	t.Parallel()

	store := newTestStore(t)
	ctx := context.Background()
	upload, err := store.ProcessUpload(ctx, "idempotent.bin", bytes.NewReader([]byte("idempotent")))
	if err != nil {
		t.Fatalf("upload: %v", err)
	}
	if err := store.RetireManifest(ctx, upload.ManifestID); err != nil {
		t.Fatalf("first retirement: %v", err)
	}
	first, err := store.GetManifest(ctx, upload.ManifestID)
	if err != nil {
		t.Fatalf("get first retirement: %v", err)
	}
	if err := store.RetireManifest(ctx, upload.ManifestID); err != nil {
		t.Fatalf("second retirement: %v", err)
	}
	second, err := store.GetManifest(ctx, upload.ManifestID)
	if err != nil {
		t.Fatalf("get second retirement: %v", err)
	}
	if first.RetiredAt == nil || second.RetiredAt == nil || !first.RetiredAt.Equal(*second.RetiredAt) {
		t.Fatalf("idempotent retirement changed timestamp: first=%v second=%v", first.RetiredAt, second.RetiredAt)
	}
}

func TestCollectGarbageFailsSafeOnMalformedManifest(t *testing.T) {
	t.Parallel()

	store := newTestStore(t)
	ctx := context.Background()
	chunkHash := strings.Repeat("f", 64)
	createOldChunk(t, store, chunkHash, []byte("must survive malformed scan"), time.Now().UTC().Add(-2*time.Hour))

	manifestID := strings.Repeat("1", 64)
	record := ManifestRecord{
		ManifestID:     manifestID,
		FileHash:       strings.Repeat("2", 64),
		ChunkHashes:    []string{chunkHash},
		TotalSizeBytes: 25,
		ChunkCount:     1,
		CreatedAt:      time.Now().UTC(),
		Immutable:      true,
	}
	payload, err := json.Marshal(record)
	if err != nil {
		t.Fatalf("marshal malformed manifest: %v", err)
	}
	if err := store.db.Update(func(txn *badger.Txn) error {
		return txn.Set(manifestKey(manifestID), payload)
	}); err != nil {
		t.Fatalf("insert malformed manifest: %v", err)
	}

	if _, err := store.CollectGarbage(ctx, time.Now().UTC().Add(-time.Hour)); err == nil {
		t.Fatalf("expected malformed manifest to stop gc")
	}
	assertChunkExists(t, store, chunkHash)
}

func createOldChunk(t *testing.T, store *Store, chunkHash string, content []byte, createdAt time.Time) {
	t.Helper()

	storagePath, path, err := store.chunkPaths(chunkHash)
	if err != nil {
		t.Fatalf("chunk path: %v", err)
	}
	if err := writeChunkIfMissing(path, content); err != nil {
		t.Fatalf("write chunk: %v", err)
	}
	if err := os.Chtimes(path, createdAt, createdAt); err != nil {
		t.Fatalf("age chunk: %v", err)
	}
	if err := store.putChunk(context.Background(), ChunkRecord{
		ChunkHash:        chunkHash,
		SizeBytes:        int64(len(content)),
		StoragePath:      storagePath,
		ManifestRefCount: 0,
		Retained:         false,
		CreatedAt:        createdAt,
	}); err != nil {
		t.Fatalf("store chunk metadata: %v", err)
	}
}

func assertChunkExists(t *testing.T, store *Store, chunkHash string) {
	t.Helper()

	if _, found, err := store.GetChunk(context.Background(), chunkHash); err != nil || !found {
		t.Fatalf("expected chunk %s to exist: found=%v err=%v", chunkHash, found, err)
	}
}

func assertChunkMissing(t *testing.T, store *Store, chunkHash string) {
	t.Helper()

	if _, found, err := store.GetChunk(context.Background(), chunkHash); err != nil || found {
		t.Fatalf("expected chunk %s to be missing: found=%v err=%v", chunkHash, found, err)
	}
}

type pauseAfterFirstReadReader struct {
	release chan struct{}
	first   bool
	mu      sync.Mutex
}

func (r *pauseAfterFirstReadReader) Read(p []byte) (int, error) {
	r.mu.Lock()
	first := !r.first
	if first {
		r.first = true
	}
	r.mu.Unlock()

	if first {
		for i := range p {
			p[i] = byte(i % 251)
		}
		return len(p), nil
	}

	<-r.release
	return 0, io.EOF
}
