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

	// Orphan chunk GC: delete chunks with RefCount=0 older than 30 minutes.
	go func() {
		ticker := time.NewTicker(10 * time.Minute)
		defer ticker.Stop()

		for range ticker.C {
			grace := time.Now().UTC().Add(-30 * time.Minute)
			deleted, err := store.CleanupOrphanChunks(context.Background(), grace)
			if err != nil {
				log.Printf("event=orphan_chunk_cleanup_failed error=%v", err)
				continue
			}
			if deleted > 0 {
				log.Printf("event=orphan_chunk_cleanup deleted=%d", deleted)
			}
		}
	}()

	handler := uds.NewHandler(cfg, db)

	log.Printf("vault-core starting")
	log.Printf("vault-core uds path %s", cfg.UDSPath)
	log.Printf("vault-core badger path %s", cfg.BadgerPath)
	log.Printf("vault-core chunk root %s", cfg.ChunkRoot)

	if err := uds.ListenAndServe(cfg, handler); err != nil {
		log.Fatalf("vault-core stopped: %v", err)
	}
}
