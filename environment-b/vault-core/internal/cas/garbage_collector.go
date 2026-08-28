package cas

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/dgraph-io/badger/v4"
)

// GarbageCollectionReport describes one safe garbage-collection sweep.
type GarbageCollectionReport struct {
	ScannedManifests       int
	ScannedChunkRecords    int
	ScannedPhysicalFiles   int
	CandidateChunks        int
	DeletedChunks          int
	DeletedPhysicalOrphans int
	SkippedActiveChunks    int
}

type garbageCollectionScan struct {
	referencedChunks map[string]struct{}
	retiredChunkAt   map[string]time.Time
	chunkRecords     map[string]ChunkRecord
	physicalOrphans  []string
	report           GarbageCollectionReport
}

func (s *Store) registerActiveUpload(uploadID string) {
	if strings.TrimSpace(uploadID) == "" {
		return
	}

	s.activeUploadsMu.Lock()
	defer s.activeUploadsMu.Unlock()

	if s.activeUploads == nil {
		s.activeUploads = make(map[string]map[string]struct{})
	}
	s.activeUploads[uploadID] = make(map[string]struct{})
}

func (s *Store) unregisterActiveUpload(uploadID string) {
	if strings.TrimSpace(uploadID) == "" {
		return
	}

	// Keep the same lifecycle -> active-upload lock order as touchChunk and GC.
	s.lifecycleMu.RLock()
	defer s.lifecycleMu.RUnlock()

	s.activeUploadsMu.Lock()
	defer s.activeUploadsMu.Unlock()
	delete(s.activeUploads, uploadID)
}

func (s *Store) markActiveUploadChunk(uploadID, chunkHash string) {
	if strings.TrimSpace(uploadID) == "" {
		return
	}

	s.activeUploadsMu.Lock()
	defer s.activeUploadsMu.Unlock()

	chunks, ok := s.activeUploads[uploadID]
	if !ok {
		return
	}
	chunks[chunkHash] = struct{}{}
}

func (s *Store) snapshotActiveChunkHashes() map[string]struct{} {
	s.activeUploadsMu.RLock()
	defer s.activeUploadsMu.RUnlock()

	active := make(map[string]struct{})
	for _, chunks := range s.activeUploads {
		for chunkHash := range chunks {
			active[chunkHash] = struct{}{}
		}
	}
	return active
}

// CollectGarbage removes old chunks that are not referenced by any committed
// manifest. The lifecycle lock makes chunk writes and manifest commits atomic
// with respect to a sweep, while retrieval remains concurrent because GC never
// deletes a chunk referenced by the manifest snapshot.
func (s *Store) CollectGarbage(ctx context.Context, olderThan time.Time) (GarbageCollectionReport, error) {
	var report GarbageCollectionReport
	if err := contextErr(ctx); err != nil {
		return report, err
	}
	if strings.TrimSpace(s.chunkRoot) == "" {
		return report, fmt.Errorf("chunk root is empty")
	}

	s.lifecycleMu.Lock()
	defer s.lifecycleMu.Unlock()

	activeChunks := s.snapshotActiveChunkHashes()
	scan, err := s.scanGarbageCollection(ctx, olderThan, activeChunks)
	if err != nil {
		return scan.report, err
	}
	report = scan.report

	var deletionErrors []error
	for chunkHash, record := range scan.chunkRecords {
		if err := contextErr(ctx); err != nil {
			return report, err
		}

		if _, referenced := scan.referencedChunks[chunkHash]; referenced {
			continue
		}
		if _, active := activeChunks[chunkHash]; active {
			if !record.CreatedAt.IsZero() && record.CreatedAt.Before(olderThan) {
				report.SkippedActiveChunks++
			}
			continue
		}

		retiredAt, retired := scan.retiredChunkAt[chunkHash]
		if retired {
			if !retiredAt.Before(olderThan) {
				continue
			}
		} else {
			// A positive refcount without an active manifest is inconsistent
			// metadata. Keep it until an operator repairs the inconsistency.
			if record.ManifestRefCount != 0 {
				continue
			}
			if record.CreatedAt.IsZero() || !record.CreatedAt.Before(olderThan) {
				continue
			}
		}

		report.CandidateChunks++
		_, absolutePath, err := s.chunkPaths(chunkHash)
		if err != nil {
			deletionErrors = append(deletionErrors, fmt.Errorf("resolve chunk %s path: %w", chunkHash, err))
			continue
		}

		if err := removeChunkFile(absolutePath); err != nil {
			deletionErrors = append(deletionErrors, fmt.Errorf("remove chunk %s file: %w", chunkHash, err))
			continue
		}

		deleted, err := s.deleteChunkMetadata(ctx, chunkHash, olderThan, retired)
		if err != nil {
			deletionErrors = append(deletionErrors, fmt.Errorf("remove chunk %s metadata: %w", chunkHash, err))
			continue
		}
		if deleted {
			report.DeletedChunks++
		}
	}

	for _, path := range scan.physicalOrphans {
		if err := contextErr(ctx); err != nil {
			return report, err
		}
		if err := removeChunkFile(path); err != nil {
			deletionErrors = append(deletionErrors, fmt.Errorf("remove physical orphan %s: %w", path, err))
			continue
		}
		report.DeletedPhysicalOrphans++
	}

	return report, errors.Join(deletionErrors...)
}

// CleanupOrphanChunks preserves the original cleanup API while using the
// concurrent-safe garbage collector implementation.
func (s *Store) CleanupOrphanChunks(ctx context.Context, olderThan time.Time) (int, error) {
	report, err := s.CollectGarbage(ctx, olderThan)
	return report.DeletedChunks + report.DeletedPhysicalOrphans, err
}

func (s *Store) scanGarbageCollection(ctx context.Context, olderThan time.Time, activeChunks map[string]struct{}) (garbageCollectionScan, error) {
	scan := garbageCollectionScan{
		referencedChunks: make(map[string]struct{}),
		retiredChunkAt:   make(map[string]time.Time),
		chunkRecords:     make(map[string]ChunkRecord),
	}

	err := s.db.View(func(txn *badger.Txn) error {
		manifestIterator := txn.NewIterator(badger.DefaultIteratorOptions)
		defer manifestIterator.Close()

		manifestPrefixBytes := []byte(manifestPrefix)
		for manifestIterator.Seek(manifestPrefixBytes); manifestIterator.ValidForPrefix(manifestPrefixBytes); manifestIterator.Next() {
			if err := contextErr(ctx); err != nil {
				return err
			}

			item := manifestIterator.Item()
			manifest, err := decodeManifest(item)
			if err != nil {
				return fmt.Errorf("decode manifest: %w", err)
			}
			if err := validateManifest(manifest); err != nil {
				return fmt.Errorf("validate manifest: %w", err)
			}

			keyID := strings.TrimPrefix(string(item.KeyCopy(nil)), manifestPrefix)
			normalizedKeyID, err := normalizeHash(keyID)
			if err != nil || normalizedKeyID != manifest.ManifestID {
				return fmt.Errorf("manifest key tidak konsisten: %s", keyID)
			}

			scan.report.ScannedManifests++
			for _, chunkHash := range manifest.ChunkHashes {
				normalizedHash, err := normalizeHash(chunkHash)
				if err != nil {
					return fmt.Errorf("normalize manifest chunk: %w", err)
				}
				if !manifest.Retired {
					scan.referencedChunks[normalizedHash] = struct{}{}
					continue
				}

				if previous, exists := scan.retiredChunkAt[normalizedHash]; !exists || manifest.RetiredAt.After(previous) {
					scan.retiredChunkAt[normalizedHash] = *manifest.RetiredAt
				}
			}
		}

		chunkIterator := txn.NewIterator(badger.DefaultIteratorOptions)
		defer chunkIterator.Close()

		chunkPrefixBytes := []byte(chunkPrefix)
		for chunkIterator.Seek(chunkPrefixBytes); chunkIterator.ValidForPrefix(chunkPrefixBytes); chunkIterator.Next() {
			if err := contextErr(ctx); err != nil {
				return err
			}

			item := chunkIterator.Item()
			record, err := decodeChunk(item)
			if err != nil {
				return fmt.Errorf("decode chunk metadata: %w", err)
			}

			keyHash := strings.TrimPrefix(string(item.KeyCopy(nil)), chunkPrefix)
			normalizedKeyHash, err := normalizeHash(keyHash)
			if err != nil {
				return fmt.Errorf("invalid chunk metadata key: %w", err)
			}
			normalizedRecordHash, err := normalizeHash(record.ChunkHash)
			if err != nil || normalizedRecordHash != normalizedKeyHash {
				return fmt.Errorf("chunk metadata key tidak konsisten: %s", keyHash)
			}
			if record.ManifestRefCount < 0 {
				return fmt.Errorf("negative manifest ref count for chunk %s", normalizedKeyHash)
			}

			record.ChunkHash = normalizedRecordHash
			scan.chunkRecords[normalizedRecordHash] = record
			scan.report.ScannedChunkRecords++
		}

		return nil
	})
	if err != nil {
		return scan, fmt.Errorf("scan gc metadata: %w", err)
	}

	for hash, record := range scan.chunkRecords {
		if _, referenced := scan.referencedChunks[hash]; referenced {
			continue
		}
		if _, active := activeChunks[hash]; active && !record.CreatedAt.IsZero() && record.CreatedAt.Before(olderThan) {
			scan.report.SkippedActiveChunks++
		}
	}

	err = filepath.WalkDir(s.chunkRoot, func(path string, entry os.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if err := contextErr(ctx); err != nil {
			return err
		}
		if entry.IsDir() || !entry.Type().IsRegular() || filepath.Ext(entry.Name()) != ".bin" {
			return nil
		}

		hash, err := normalizeHash(strings.TrimSuffix(entry.Name(), ".bin"))
		if err != nil {
			return nil
		}
		scan.report.ScannedPhysicalFiles++

		if _, referenced := scan.referencedChunks[hash]; referenced {
			return nil
		}
		if _, hasMetadata := scan.chunkRecords[hash]; hasMetadata {
			return nil
		}
		if _, active := activeChunks[hash]; active {
			scan.report.SkippedActiveChunks++
			return nil
		}
		if retiredAt, retired := scan.retiredChunkAt[hash]; retired && !retiredAt.Before(olderThan) {
			// A retired manifest can outlive its chunk metadata after a
			// partial deletion. Keep the physical bytes through the same
			// retirement grace period instead of treating them as an orphan.
			return nil
		}

		info, err := entry.Info()
		if err != nil {
			return err
		}
		if info.ModTime().Before(olderThan) {
			scan.physicalOrphans = append(scan.physicalOrphans, path)
		}
		return nil
	})
	if errors.Is(err, os.ErrNotExist) {
		return scan, nil
	}
	if err != nil {
		return scan, fmt.Errorf("scan physical chunks: %w", err)
	}

	return scan, nil
}

func (s *Store) deleteChunkMetadata(ctx context.Context, chunkHash string, olderThan time.Time, retired bool) (bool, error) {
	if err := contextErr(ctx); err != nil {
		return false, err
	}

	deleted := false
	err := s.db.Update(func(txn *badger.Txn) error {
		item, err := txn.Get(chunkKey(chunkHash))
		if errors.Is(err, badger.ErrKeyNotFound) {
			deleted = true
			return nil
		}
		if err != nil {
			return err
		}

		record, err := decodeChunk(item)
		if err != nil {
			return err
		}
		normalizedHash, err := normalizeHash(record.ChunkHash)
		if err != nil || normalizedHash != chunkHash {
			return fmt.Errorf("chunk metadata key tidak konsisten")
		}
		if !retired && (record.ManifestRefCount != 0 || record.CreatedAt.IsZero() || !record.CreatedAt.Before(olderThan)) {
			return nil
		}

		if err := txn.Delete(chunkKey(chunkHash)); err != nil {
			return err
		}
		deleted = true
		return nil
	})
	return deleted, err
}

func removeChunkFile(path string) error {
	err := os.Remove(path)
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	return err
}
