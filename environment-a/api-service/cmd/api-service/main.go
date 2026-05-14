package main

import (
	"context"
	"log"
	"net/http"
	"time"

	_ "github.com/alfiang/pui/environment-a/api-service/docs"
	"github.com/alfiang/pui/environment-a/api-service/internal/app"
	"github.com/alfiang/pui/environment-a/api-service/internal/config"
)

// @title HashBox API Service
// @version 1.0
// @description API service untuk autentikasi, hierarki direktori, dan metadata berkas immutable.
// @BasePath /api/v1
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("load api config: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	application, err := app.Build(ctx, cfg)
	if err != nil {
		log.Fatalf("build api application: %v", err)
	}
	defer func() {
		if closeErr := application.Close(); closeErr != nil {
			log.Printf("close app resources: %v", closeErr)
		}
	}()

	server := &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           application.Router,
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("api-service listening on %s", cfg.HTTPAddr)
	log.Printf("api-service migrations path %s", cfg.MigrationsPath)
	log.Printf("api-service vault uds path %s", cfg.VaultUDSPath)

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("api-service stopped: %v", err)
	}
}
