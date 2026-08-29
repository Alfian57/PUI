package main

import (
	"context"
	"log"
	"time"

	"github.com/alfiang/pui/environment-b/vault-core/internal/badgerdb"
	"github.com/alfiang/pui/environment-b/vault-core/internal/cas"
	"github.com/alfiang/pui/environment-b/vault-core/internal/config"
	"github.com/alfiang/pui/environment-b/vault-core/internal/fastcdc"
	"github.com/alfiang/pui/environment-b/vault-core/internal/storage"
	"github.com/alfiang/pui/environment-b/vault-core/internal/uds"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("load vault config: %v", err)
	}

	if err := storage.EnsureLayout(cfg.UDSPath, cfg.ChunkRoot); err != nil {
		log.Fatalf("prepare vault layout: %v", err)
	}

	db, err := badgerdb.Open(cfg.BadgerPath)
	if err != nil {
		log.Fatalf("open badgerdb: %v", err)
	}
	defer db.Close()

	store := cas.NewStore(
		db,
		cfg.ChunkRoot,
		fastcdc.Config{
			MinSize: cfg.FastCDCMinChunkSize,
			AvgSize: cfg.FastCDCAvgChunkSize,
			MaxSize: cfg.FastCDCMaxChunkSize,
		},
		cfg.StrictDownloadVerify,
		cfg.StrictVerifyMaxBytes,
	)

	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()

		for range ticker.C {
			deleted, err := store.CleanupExpiredUploadSessions(context.Background(), time.Now().UTC())
			if err != nil {
				log.Printf("event=upload_session_cleanup_failed error=%v", err)
				continue
			}

			if deleted > 0 {
				log.Printf("event=upload_session_cleanup deleted=%d", deleted)
			}
		}
	}()

	// Concurrent GC: reclaim chunks absent from every committed manifest after a grace period.
	go func() {
		ticker := time.NewTicker(10 * time.Minute)
		defer ticker.Stop()

		for range ticker.C {
			grace := time.Now().UTC().Add(-30 * time.Minute)
			report, err := store.CollectGarbage(context.Background(), grace)
			if err != nil {
				log.Printf("event=garbage_collection_failed error=%v", err)
				continue
			}
			if report.DeletedChunks > 0 || report.DeletedPhysicalOrphans > 0 {
				log.Printf(
					"event=garbage_collection_completed manifests=%d chunk_records=%d physical_files=%d candidates=%d deleted_chunks=%d deleted_physical_orphans=%d skipped_active=%d",
					report.ScannedManifests,
					report.ScannedChunkRecords,
					report.ScannedPhysicalFiles,
					report.CandidateChunks,
					report.DeletedChunks,
					report.DeletedPhysicalOrphans,
					report.SkippedActiveChunks,
				)
			}
		}
	}()

	handler := uds.NewHandler(cfg, db)

	log.Printf("%s vault-core starting", cfg.AppName)
	log.Printf("vault-core uds path %s", cfg.UDSPath)
	log.Printf("vault-core badger path %s", cfg.BadgerPath)
	log.Printf("vault-core chunk root %s", cfg.ChunkRoot)

	if err := uds.ListenAndServe(cfg, handler); err != nil {
		log.Fatalf("vault-core stopped: %v", err)
	}
}
