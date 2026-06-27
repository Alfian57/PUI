package cas

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/alfiang/pui/environment-b/vault-core/internal/fastcdc"
	"github.com/dgraph-io/badger/v4"
	"github.com/zeebo/blake3"
)

const (
	manifestPrefix = "manifest:"
	chunkPrefix    = "chunk:"
	uploadPrefix   = "upload:"
)

type Store struct {
	db                   *badger.DB
	chunkRoot            string
	chunking             fastcdc.Config
	strictVerify         bool
	strictVerifyMaxBytes int64
}

func NewStore(db *badger.DB, chunkRoot string, chunking fastcdc.Config, strictVerify bool, strictVerifyMaxBytes int64) *Store {
	return &Store{
		db:                   db,
		chunkRoot:            chunkRoot,
		chunking:             chunking,
		strictVerify:         strictVerify,
		strictVerifyMaxBytes: strictVerifyMaxBytes,
	}
}

func (s *Store) ProcessUpload(ctx context.Context, fileName string, reader io.Reader) (result UploadCommitResult, err error) {
	if err := contextErr(ctx); err != nil {
		return UploadCommitResult{}, err
	}

	uploadSession, err := s.createUploadSession(ctx, fileName)
	if err != nil {
		return UploadCommitResult{}, fmt.Errorf("create upload session: %w", err)
	}

	defer func() {
		if err == nil {
			return
		}

		uploadSession.State = "failed"
		if updateErr := s.putUploadSession(ctx, uploadSession); updateErr != nil {
			err = fmt.Errorf("%w; update upload session failed: %v", err, updateErr)
		}
	}()

	chunkCh := make(chan fastcdc.Chunk, 16)
	splitErrCh := make(chan error, 1)
	pipelineCtx, cancel := context.WithCancel(ctx)
	defer cancel()

	go func() {
		defer close(chunkCh)
		splitErrCh <- fastcdc.Split(pipelineCtx, reader, s.chunking, chunkCh)
	}()

	fileHasher := blake3.New()
	chunkHashes := make([]string, 0, 128)
	var totalSize int64
	newChunkCount := 0
	reuseChunkCount := 0

	for chunk := range chunkCh {
		if _, err := fileHasher.Write(chunk.Bytes); err != nil {
			cancel()
			return UploadCommitResult{}, fmt.Errorf("update file hash: %w", err)
		}

		hashBytes := blake3.Sum256(chunk.Bytes)
		chunkHash := hex.EncodeToString(hashBytes[:])

		created, err := s.touchChunk(ctx, chunkHash, chunk.Bytes)
		if err != nil {
			cancel()
			return UploadCommitResult{}, fmt.Errorf("process chunk %d: %w", chunk.Index, err)
		}

		if created {
			newChunkCount++
		} else {
			reuseChunkCount++
		}

		chunkHashes = append(chunkHashes, chunkHash)
		totalSize += int64(chunk.Size)
		// Session is accumulated in memory; written once at commit to avoid O(N²) DB writes.
	}

	if err := <-splitErrCh; err != nil {
		return UploadCommitResult{}, fmt.Errorf("split upload stream: %w", err)
	}

	if totalSize == 0 {
		return UploadCommitResult{}, fmt.Errorf("%w: berkas kosong tidak dapat dikomit", ErrInvalidUpload)
	}

	fileHash := hex.EncodeToString(fileHasher.Sum(nil))
	manifest := ManifestRecord{
		ManifestID:     fileHash,
		FileHash:       fileHash,
		ChunkHashes:    chunkHashes,
		TotalSizeBytes: totalSize,
		ChunkCount:     len(chunkHashes),
		CreatedAt:      time.Now().UTC(),
		Immutable:      true,
	}

	if err := s.commitManifestAndChunkRefs(ctx, manifest); err != nil {
		return UploadCommitResult{}, fmt.Errorf("commit manifest: %w", err)
	}

	totalChunks := newChunkCount + reuseChunkCount
	dedupRatio := 0.0
	if totalChunks > 0 {
		dedupRatio = float64(reuseChunkCount) / float64(totalChunks)
	}

	uploadSession.ReceivedChunks = chunkHashes
	uploadSession.State = "committed"
	if err := s.putUploadSession(ctx, uploadSession); err != nil {
		return UploadCommitResult{}, fmt.Errorf("mark upload session committed: %w", err)
	}

	result = UploadCommitResult{
		ManifestID:      manifest.ManifestID,
		FileHash:        manifest.FileHash,
		TotalSizeBytes:  manifest.TotalSizeBytes,
		ChunkCount:      manifest.ChunkCount,
		DedupRatio:      dedupRatio,
		Immutable:       true,
		NewChunkCount:   newChunkCount,
		ReuseChunkCount: reuseChunkCount,
	}

	return result, nil
}

// CleanupOrphanChunks deletes chunk metadata and physical files for chunks
// that have ManifestRefCount == 0 and were created before `olderThan`.
// The grace period prevents deleting chunks from in-flight uploads.
func (s *Store) CleanupOrphanChunks(ctx context.Context, olderThan time.Time) (int, error) {
	if err := contextErr(ctx); err != nil {
		return 0, err
	}

	var candidates []ChunkRecord
	err := s.db.View(func(txn *badger.Txn) error {
		opts := badger.DefaultIteratorOptions
		opts.PrefetchSize = 64
		it := txn.NewIterator(opts)
		defer it.Close()

		prefix := []byte(chunkPrefix)
		for it.Seek(prefix); it.ValidForPrefix(prefix); it.Next() {
			record, err := decodeChunk(it.Item())
			if err != nil {
				continue
			}
			if record.ManifestRefCount == 0 && record.CreatedAt.Before(olderThan) {
				candidates = append(candidates, record)
			}
		}
		return nil
	})
	if err != nil {
		return 0, fmt.Errorf("scan orphan chunks: %w", err)
	}

	deleted := 0
	for _, candidate := range candidates {
		if err := contextErr(ctx); err != nil {
			return deleted, err
		}

		_, absolutePath, err := s.chunkPaths(candidate.ChunkHash)
		if err != nil {
			continue
		}

		// Re-check RefCount inside the write transaction to close the scan→delete race.
		// Delete metadata first (atomically); remove file only after metadata is gone.
		removed := false
		dbErr := s.db.Update(func(txn *badger.Txn) error {
			item, err := txn.Get(chunkKey(candidate.ChunkHash))
			if errors.Is(err, badger.ErrKeyNotFound) {
				return nil // already cleaned by a concurrent sweep
			}
			if err != nil {
				return err
			}
			rec, err := decodeChunk(item)
			if err != nil {
				return err
			}
			// Abort if another upload has since referenced this chunk.
			if rec.ManifestRefCount != 0 || !rec.CreatedAt.Before(olderThan) {
				return nil
			}
			removed = true
			return txn.Delete(chunkKey(candidate.ChunkHash))
		})
		if dbErr != nil || !removed {
			continue
		}

		if err := os.Remove(absolutePath); err != nil && !errors.Is(err, os.ErrNotExist) {
			log.Printf("event=orphan_chunk_file_remove_failed hash=%s err=%v", candidate.ChunkHash, err)
		}
		deleted++
	}

	return deleted, nil
}

func (s *Store) CleanupExpiredUploadSessions(ctx context.Context, now time.Time) (int, error) {
	if err := contextErr(ctx); err != nil {
		return 0, err
	}

	deleted := 0
	err := s.db.Update(func(txn *badger.Txn) error {
		it := txn.NewIterator(badger.DefaultIteratorOptions)
		defer it.Close()

		prefix := []byte(uploadPrefix)
		for it.Seek(prefix); it.ValidForPrefix(prefix); it.Next() {
			item := it.Item()
			session, err := decodeUploadSession(item)
			if err != nil {
				return fmt.Errorf("decode upload session: %w", err)
			}

			if session.ExpiresAt.After(now) {
				continue
			}

			if err := txn.Delete(item.KeyCopy(nil)); err != nil {
				return fmt.Errorf("delete expired upload session: %w", err)
			}

			deleted++
		}

		return nil
	})
	if err != nil {
		return 0, fmt.Errorf("cleanup upload sessions: %w", err)
	}

	return deleted, nil
}

func (s *Store) GetManifest(ctx context.Context, manifestID string) (ManifestRecord, error) {
	manifestID, err := normalizeHash(manifestID)
	if err != nil {
		return ManifestRecord{}, err
	}

	if err := contextErr(ctx); err != nil {
		return ManifestRecord{}, err
	}

	var out ManifestRecord
	err = s.db.View(func(txn *badger.Txn) error {
		item, err := txn.Get(manifestKey(manifestID))
		if err != nil {
			return err
		}

		out, err = decodeManifest(item)
		if err != nil {
			return fmt.Errorf("decode manifest: %w", err)
		}

		return nil
	})
	if err != nil {
		if errors.Is(err, badger.ErrKeyNotFound) {
			return ManifestRecord{}, ErrNotFound
		}

		return ManifestRecord{}, fmt.Errorf("lookup manifest: %w", err)
	}

	if err := validateManifest(out); err != nil {
		return ManifestRecord{}, fmt.Errorf("validate manifest: %w", err)
	}

	return out, nil
}

func (s *Store) OpenObject(ctx context.Context, manifestID string) (io.ReadCloser, int64, error) {
	manifest, err := s.GetManifest(ctx, manifestID)
	if err != nil {
		return nil, 0, err
	}

	// Pre-flight: verify all chunk files exist before sending any bytes.
	// This turns "missing chunk" into an early error rather than a mid-stream truncation.
	for _, chunkHash := range manifest.ChunkHashes {
		_, absolutePath, err := s.chunkPaths(chunkHash)
		if err != nil {
			return nil, 0, err
		}
		if _, err := os.Stat(absolutePath); err != nil {
			return nil, 0, fmt.Errorf("chunk %s unavailable: %w", chunkHash, err)
		}
	}

	// Strict mode: for small objects, fully reconstruct + verify hash before sending
	// so a corrupted chunk is detected before any bytes reach the client (200 + Content-Length
	// already committed). Uses chunkRoot dir for temp to avoid tmpfs exhaustion.
	if s.strictVerify && manifest.TotalSizeBytes <= s.strictVerifyMaxBytes {
		return s.openObjectStrict(ctx, manifest)
	}

	// Streaming mode for large objects: pre-flight already handled missing chunks;
	// hash corruption is detected mid-stream (client receives truncated body).
	return s.openObjectStream(ctx, manifest)
}

// openObjectStrict reconstructs the full object into a temp file, verifies all hashes,
// then returns a reader. Error is returned before any byte is sent to the caller.
func (s *Store) openObjectStrict(ctx context.Context, manifest ManifestRecord) (io.ReadCloser, int64, error) {
	tmpFile, err := os.CreateTemp(s.chunkRoot, ".object-*.tmp")
	if err != nil {
		return nil, 0, fmt.Errorf("create temp object file: %w", err)
	}
	cleanup := func() {
		_ = tmpFile.Close()
		_ = os.Remove(tmpFile.Name())
	}

	fileHasher := blake3.New()
	var totalWritten int64

	for _, chunkHash := range manifest.ChunkHashes {
		if err := contextErr(ctx); err != nil {
			cleanup()
			return nil, 0, err
		}

		_, absolutePath, err := s.chunkPaths(chunkHash)
		if err != nil {
			cleanup()
			return nil, 0, err
		}

		chunkFile, err := os.Open(absolutePath)
		if err != nil {
			cleanup()
			return nil, 0, fmt.Errorf("open chunk %s: %w", chunkHash, err)
		}

		chunkHasher := blake3.New()
		written, copyErr := io.Copy(io.MultiWriter(tmpFile, fileHasher, chunkHasher), chunkFile)
		_ = chunkFile.Close()
		if copyErr != nil {
			cleanup()
			return nil, 0, fmt.Errorf("copy chunk %s: %w", chunkHash, copyErr)
		}

		if !strings.EqualFold(hex.EncodeToString(chunkHasher.Sum(nil)), chunkHash) {
			cleanup()
			return nil, 0, fmt.Errorf("chunk hash mismatch for %s", chunkHash)
		}
		totalWritten += written
	}

	if !strings.EqualFold(hex.EncodeToString(fileHasher.Sum(nil)), manifest.FileHash) {
		cleanup()
		return nil, 0, fmt.Errorf("object hash does not match manifest")
	}

	if _, err := tmpFile.Seek(0, io.SeekStart); err != nil {
		cleanup()
		return nil, 0, fmt.Errorf("rewind temp object file: %w", err)
	}

	return &deleteOnCloseFile{File: tmpFile}, totalWritten, nil
}

// openObjectStream pipes chunk data directly to the caller with inline hash verification.
// Pre-flight Stat was already done; a corrupted chunk is detected mid-stream.
func (s *Store) openObjectStream(ctx context.Context, manifest ManifestRecord) (io.ReadCloser, int64, error) {
	pr, pw := io.Pipe()

	go func() {
		fileHasher := blake3.New()
		for _, chunkHash := range manifest.ChunkHashes {
			if err := contextErr(ctx); err != nil {
				pw.CloseWithError(err)
				return
			}

			_, absolutePath, err := s.chunkPaths(chunkHash)
			if err != nil {
				pw.CloseWithError(err)
				return
			}

			chunkFile, err := os.Open(absolutePath)
			if err != nil {
				pw.CloseWithError(fmt.Errorf("open chunk %s: %w", chunkHash, err))
				return
			}

			chunkHasher := blake3.New()
			_, copyErr := io.Copy(io.MultiWriter(pw, fileHasher, chunkHasher), chunkFile)
			_ = chunkFile.Close()
			if copyErr != nil {
				pw.CloseWithError(fmt.Errorf("copy chunk %s: %w", chunkHash, copyErr))
				return
			}

			if !strings.EqualFold(hex.EncodeToString(chunkHasher.Sum(nil)), chunkHash) {
				pw.CloseWithError(fmt.Errorf("chunk hash mismatch for %s", chunkHash))
				return
			}
		}

		if !strings.EqualFold(hex.EncodeToString(fileHasher.Sum(nil)), manifest.FileHash) {
			pw.CloseWithError(fmt.Errorf("object hash does not match manifest"))
			return
		}
		pw.Close()
	}()

	return pr, manifest.TotalSizeBytes, nil
}

type deleteOnCloseFile struct {
	*os.File
}

func (f *deleteOnCloseFile) Close() error {
	name := f.Name()
	err := f.File.Close()
	_ = os.Remove(name)
	return err
}

func (s *Store) GetChunk(ctx context.Context, chunkHash string) (ChunkRecord, bool, error) {
	chunkHash, err := normalizeHash(chunkHash)
	if err != nil {
		return ChunkRecord{}, false, err
	}

	if err := contextErr(ctx); err != nil {
		return ChunkRecord{}, false, err
	}

	var out ChunkRecord
	err = s.db.View(func(txn *badger.Txn) error {
		item, err := txn.Get(chunkKey(chunkHash))
		if err != nil {
			return err
		}

		out, err = decodeChunk(item)
		if err != nil {
			return fmt.Errorf("decode chunk: %w", err)
		}

		return nil
	})
	if err != nil {
		if errors.Is(err, badger.ErrKeyNotFound) {
			return ChunkRecord{}, false, nil
		}

		return ChunkRecord{}, false, fmt.Errorf("lookup chunk: %w", err)
	}

	return out, true, nil
}

func (s *Store) touchChunk(ctx context.Context, chunkHash string, chunkBytes []byte) (bool, error) {
	chunkHash, err := normalizeHash(chunkHash)
	if err != nil {
		return false, err
	}

	if err := contextErr(ctx); err != nil {
		return false, err
	}

	_, found, err := s.GetChunk(ctx, chunkHash)
	if err != nil {
		return false, err
	}

	if found {
		// Even if metadata exists, the physical file may have been removed by a GC race.
		// Re-persist it if missing so the upload can commit successfully.
		_, absolutePath, pathErr := s.chunkPaths(chunkHash)
		if pathErr != nil {
			return false, pathErr
		}
		if _, statErr := os.Stat(absolutePath); statErr != nil {
			if err := writeChunkIfMissing(absolutePath, chunkBytes); err != nil {
				return false, fmt.Errorf("re-persist chunk file after gc race: %w", err)
			}
		}
		return false, nil
	}

	storagePath, absolutePath, err := s.chunkPaths(chunkHash)
	if err != nil {
		return false, err
	}

	if err := writeChunkIfMissing(absolutePath, chunkBytes); err != nil {
		return false, fmt.Errorf("persist chunk file: %w", err)
	}

	created := false
	err = s.db.Update(func(txn *badger.Txn) error {
		item, err := txn.Get(chunkKey(chunkHash))
		if err == nil {
			_, err := decodeChunk(item)
			if err != nil {
				return fmt.Errorf("decode chunk metadata: %w", err)
			}

			return nil
		}

		if !errors.Is(err, badger.ErrKeyNotFound) {
			return err
		}

		record := ChunkRecord{
			ChunkHash:        chunkHash,
			SizeBytes:        int64(len(chunkBytes)),
			StoragePath:      storagePath,
			ManifestRefCount: 0,
			Retained:         false,
			CreatedAt:        time.Now().UTC(),
		}

		payload, err := json.Marshal(record)
		if err != nil {
			return fmt.Errorf("marshal chunk metadata: %w", err)
		}

		created = true
		return txn.Set(chunkKey(chunkHash), payload)
	})
	if err != nil {
		return false, fmt.Errorf("commit chunk metadata: %w", err)
	}

	return created, nil
}

func (s *Store) putChunk(ctx context.Context, record ChunkRecord) error {
	if err := contextErr(ctx); err != nil {
		return err
	}

	payload, err := json.Marshal(record)
	if err != nil {
		return fmt.Errorf("marshal chunk metadata: %w", err)
	}

	err = s.db.Update(func(txn *badger.Txn) error {
		return txn.Set(chunkKey(record.ChunkHash), payload)
	})
	if err != nil {
		return fmt.Errorf("store chunk metadata: %w", err)
	}

	return nil
}

func (s *Store) commitManifestAndChunkRefs(ctx context.Context, manifest ManifestRecord) error {
	manifestID, err := normalizeHash(manifest.ManifestID)
	if err != nil {
		return err
	}

	if err := contextErr(ctx); err != nil {
		return err
	}

	manifest.ManifestID = manifestID
	manifest.FileHash = manifestID
	if err := validateManifest(manifest); err != nil {
		return err
	}

	payload, err := json.Marshal(manifest)
	if err != nil {
		return fmt.Errorf("marshal manifest: %w", err)
	}

	chunkRefCount := make(map[string]int, len(manifest.ChunkHashes))
	for _, chunkHash := range manifest.ChunkHashes {
		chunkRefCount[chunkHash]++
	}

	err = s.db.Update(func(txn *badger.Txn) error {
		_, err := txn.Get(manifestKey(manifest.ManifestID))
		if err == nil {
			return nil
		}

		if !errors.Is(err, badger.ErrKeyNotFound) {
			return err
		}

		for chunkHash, increment := range chunkRefCount {
			item, err := txn.Get(chunkKey(chunkHash))
			if err != nil {
				if errors.Is(err, badger.ErrKeyNotFound) {
					return fmt.Errorf("missing chunk metadata for %s", chunkHash)
				}

				return err
			}

			record, err := decodeChunk(item)
			if err != nil {
				return fmt.Errorf("decode chunk metadata: %w", err)
			}

			record.ManifestRefCount += increment
			record.Retained = record.ManifestRefCount > 0

			recordPayload, err := json.Marshal(record)
			if err != nil {
				return fmt.Errorf("marshal chunk metadata: %w", err)
			}

			if err := txn.Set(chunkKey(chunkHash), recordPayload); err != nil {
				return err
			}
		}

		if err := txn.Set(manifestKey(manifest.ManifestID), payload); err != nil {
			return err
		}

		return nil
	})
	if err != nil {
		return fmt.Errorf("store manifest: %w", err)
	}

	return nil
}

func (s *Store) chunkPaths(chunkHash string) (string, string, error) {
	chunkHash, err := normalizeHash(chunkHash)
	if err != nil {
		return "", "", err
	}

	if len(chunkHash) < 4 {
		return "", "", ErrInvalidHash
	}

	relativePath := filepath.Join(chunkHash[0:2], chunkHash[2:4], chunkHash+".bin")
	absolutePath := filepath.Join(s.chunkRoot, relativePath)
	storagePath := filepath.ToSlash(filepath.Join("chunks", relativePath))

	return storagePath, absolutePath, nil
}

func decodeManifest(item *badger.Item) (ManifestRecord, error) {
	var out ManifestRecord

	err := item.Value(func(val []byte) error {
		if err := json.Unmarshal(val, &out); err != nil {
			return err
		}

		return nil
	})
	if err != nil {
		return ManifestRecord{}, err
	}

	return out, nil
}

func validateManifest(manifest ManifestRecord) error {
	if manifest.ManifestID == "" || manifest.FileHash == "" {
		return ErrInvalidHash
	}

	normalizedManifestID, err := normalizeHash(manifest.ManifestID)
	if err != nil {
		return err
	}

	normalizedFileHash, err := normalizeHash(manifest.FileHash)
	if err != nil {
		return err
	}

	if normalizedManifestID != normalizedFileHash {
		return fmt.Errorf("manifest id dan file hash tidak konsisten")
	}

	if manifest.ChunkCount != len(manifest.ChunkHashes) {
		return fmt.Errorf("chunk count tidak konsisten")
	}

	if manifest.TotalSizeBytes < 0 {
		return fmt.Errorf("total size tidak valid")
	}

	if !manifest.Immutable {
		return fmt.Errorf("manifest tidak immutable")
	}

	for _, chunkHash := range manifest.ChunkHashes {
		if _, err := normalizeHash(chunkHash); err != nil {
			return err
		}
	}

	return nil
}

func decodeChunk(item *badger.Item) (ChunkRecord, error) {
	var out ChunkRecord

	err := item.Value(func(val []byte) error {
		if err := json.Unmarshal(val, &out); err != nil {
			return err
		}

		return nil
	})
	if err != nil {
		return ChunkRecord{}, err
	}

	return out, nil
}

func decodeUploadSession(item *badger.Item) (UploadSessionRecord, error) {
	var out UploadSessionRecord

	err := item.Value(func(val []byte) error {
		if err := json.Unmarshal(val, &out); err != nil {
			return err
		}

		return nil
	})
	if err != nil {
		return UploadSessionRecord{}, err
	}

	return out, nil
}

func manifestKey(manifestID string) []byte {
	return []byte(manifestPrefix + manifestID)
}

func chunkKey(chunkHash string) []byte {
	return []byte(chunkPrefix + chunkHash)
}

func uploadKey(sessionID string) []byte {
	return []byte(uploadPrefix + sessionID)
}

func normalizeHash(value string) (string, error) {
	normalized := strings.ToLower(strings.TrimSpace(value))
	if len(normalized) != 64 {
		return "", ErrInvalidHash
	}

	if _, err := hex.DecodeString(normalized); err != nil {
		return "", ErrInvalidHash
	}

	return normalized, nil
}

func contextErr(ctx context.Context) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	default:
		return nil
	}
}

func writeChunkIfMissing(targetPath string, content []byte) error {
	if _, err := os.Stat(targetPath); err == nil {
		return nil
	} else if !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("stat target chunk: %w", err)
	}

	if err := os.MkdirAll(filepath.Dir(targetPath), 0o750); err != nil {
		return fmt.Errorf("ensure chunk parent: %w", err)
	}

	tmpFile, err := os.CreateTemp(filepath.Dir(targetPath), ".chunk-*.tmp")
	if err != nil {
		return fmt.Errorf("create temp chunk file: %w", err)
	}

	tmpPath := tmpFile.Name()
	defer func() {
		_ = os.Remove(tmpPath)
	}()

	if _, err := tmpFile.Write(content); err != nil {
		_ = tmpFile.Close()
		return fmt.Errorf("write temp chunk: %w", err)
	}

	if err := tmpFile.Sync(); err != nil {
		_ = tmpFile.Close()
		return fmt.Errorf("sync temp chunk: %w", err)
	}

	if err := tmpFile.Chmod(0o640); err != nil {
		_ = tmpFile.Close()
		return fmt.Errorf("chmod temp chunk: %w", err)
	}

	if err := tmpFile.Close(); err != nil {
		return fmt.Errorf("close temp chunk: %w", err)
	}

	if err := os.Link(tmpPath, targetPath); err != nil {
		if errors.Is(err, os.ErrExist) {
			return nil
		}

		if _, statErr := os.Stat(targetPath); statErr == nil {
			return nil
		}

		return fmt.Errorf("link temp chunk: %w", err)
	}

	return nil
}

func (s *Store) createUploadSession(ctx context.Context, fileName string) (UploadSessionRecord, error) {
	if err := contextErr(ctx); err != nil {
		return UploadSessionRecord{}, err
	}

	if strings.TrimSpace(fileName) == "" {
		fileName = "unknown.bin"
	}

	raw := make([]byte, 16)
	if _, err := rand.Read(raw); err != nil {
		return UploadSessionRecord{}, fmt.Errorf("generate upload session id: %w", err)
	}

	now := time.Now().UTC()
	session := UploadSessionRecord{
		SessionID:      hex.EncodeToString(raw),
		FileName:       strings.TrimSpace(fileName),
		ReceivedChunks: make([]string, 0, 128),
		StartedAt:      now,
		ExpiresAt:      now.Add(30 * time.Minute),
		State:          "in_progress",
	}

	if err := s.putUploadSession(ctx, session); err != nil {
		return UploadSessionRecord{}, err
	}

	return session, nil
}

func (s *Store) putUploadSession(ctx context.Context, session UploadSessionRecord) error {
	if err := contextErr(ctx); err != nil {
		return err
	}

	payload, err := json.Marshal(session)
	if err != nil {
		return fmt.Errorf("marshal upload session: %w", err)
	}

	err = s.db.Update(func(txn *badger.Txn) error {
		return txn.Set(uploadKey(session.SessionID), payload)
	})
	if err != nil {
		return fmt.Errorf("store upload session: %w", err)
	}

	return nil
}
