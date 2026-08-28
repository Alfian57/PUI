package app

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/alfiang/pui/environment-a/api-service/internal/config"
	"github.com/alfiang/pui/environment-a/api-service/internal/database"
	"github.com/alfiang/pui/environment-a/api-service/internal/repository"
	"github.com/alfiang/pui/environment-a/api-service/internal/service"
	httptransport "github.com/alfiang/pui/environment-a/api-service/internal/transport/http"
	"github.com/alfiang/pui/environment-a/api-service/internal/vaultclient"
	"github.com/gin-gonic/gin"
)

type App struct {
	Router *gin.Engine
	Close  func() error
}

func Build(ctx context.Context, cfg config.Config) (*App, error) {
	if err := database.RunMigrations(cfg.DatabaseURL, cfg.MigrationsPath); err != nil {
		return nil, fmt.Errorf("run migrations: %w", err)
	}

	gormDB, err := database.OpenGORM(ctx, cfg.DatabaseURL)
	if err != nil {
		return nil, err
	}

	sqlDB, err := gormDB.DB()
	if err != nil {
		return nil, fmt.Errorf("gorm sql db: %w", err)
	}

	vault := vaultclient.New(cfg.VaultUDSPath)

	authRepo := repository.NewAuthRepository(gormDB)
	directoryRepo := repository.NewDirectoryRepository(gormDB)
	fileRepo := repository.NewFileRepository(gormDB)
	activityRepo := repository.NewActivityRepository(gormDB)
	securityEventRepo := repository.NewSecurityEventRepository(gormDB)
	adminRepo := repository.NewAdminRepository(gormDB)
	insightRepo := repository.NewInsightRepository(gormDB)

	resetMailer := service.NewSMTPMailer(service.SMTPConfig{
		Host:      cfg.SMTPHost,
		Port:      cfg.SMTPPort,
		Username:  cfg.SMTPUsername,
		Password:  cfg.SMTPPassword,
		FromEmail: cfg.SMTPFromEmail,
		FromName:  cfg.SMTPFromName,
	})
	authService := service.NewAuthService(
		authRepo,
		activityRepo,
		cfg.SessionTTLMinutes,
		cfg.PasswordResetTTLMinutes,
		cfg.PublicWebURL,
		resetMailer,
	)
	adminService := service.NewAdminService(adminRepo)
	activityService := service.NewActivityService(activityRepo)
	directoryService := service.NewDirectoryService(directoryRepo, activityRepo)
	fileService := service.NewFileService(fileRepo, directoryRepo, activityRepo, vault)
	insightService := service.NewInsightService(insightRepo)
	systemService := service.NewSystemService(sqlDB, vault, cfg.AppEnv)
	securityMonitoringService := service.NewSecurityMonitoringService(securityEventRepo)
	securityEventBridge, err := service.StartSecurityEventBridge(cfg.SecurityEventsUDSPath, cfg.SecurityEventsAllowedUIDs, securityMonitoringService)
	if err != nil {
		_ = sqlDB.Close()
		securityMonitoringService.Close()
		return nil, fmt.Errorf("start security event bridge: %w", err)
	}
	securityLabService := service.NewSecurityLabService(fileService, vault, securityMonitoringService)

	api := httptransport.NewAPI(cfg, authService, adminService, activityService, directoryService, fileService, insightService, systemService, securityLabService, securityMonitoringService)
	router, rateLimiters := httptransport.NewRouter(cfg, api, authService, securityMonitoringService)

	// Reaper: marks pending file records older than 30 minutes as failed,
	// releasing locked filenames. Uses its own context (independent of the
	// 10-second build context) so it lives for the full app lifetime.
	reaperCtx, reaperCancel := context.WithCancel(context.Background())
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				grace := time.Now().UTC().Add(-30 * time.Minute)
				n, err := fileRepo.ExpireStalePending(reaperCtx, grace)
				if err != nil {
					log.Printf("event=reaper_expire_pending_failed err=%v", err)
				} else if n > 0 {
					log.Printf("event=reaper_expire_pending count=%d", n)
				}
			case <-reaperCtx.Done():
				return
			}
		}
	}()

	retentionCtx, retentionCancel := context.WithCancel(context.Background())
	go func() {
		purge := func() {
			purged, err := securityMonitoringService.PurgeExpired(retentionCtx)
			if err != nil {
				log.Printf("event=security_event_retention_failed err=%v", err)
			} else if purged > 0 {
				log.Printf("event=security_event_retention_purged count=%d", purged)
			}
		}
		purge()
		ticker := time.NewTicker(24 * time.Hour)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				purge()
			case <-retentionCtx.Done():
				return
			}
		}
	}()

	retirementCtx, retirementCancel := context.WithCancel(context.Background())
	retirementDone := make(chan struct{})
	go func() {
		defer close(retirementDone)
		service.RunManifestRetirementWorker(retirementCtx, fileRepo, vault)
	}()

	return &App{
		Router: router,
		Close: func() error {
			reaperCancel()
			retentionCancel()
			retirementCancel()
			retirementWaitCtx, retirementWaitCancel := context.WithTimeout(context.Background(), 2*time.Second)
			select {
			case <-retirementDone:
			case <-retirementWaitCtx.Done():
			}
			retirementWaitCancel()
			securityMonitoringService.Close()
			bridgeCtx, bridgeCancel := context.WithTimeout(context.Background(), 2*time.Second)
			bridgeErr := securityEventBridge.Close(bridgeCtx)
			bridgeCancel()
			for _, rl := range rateLimiters {
				rl.Stop()
			}
			if bridgeErr != nil {
				return bridgeErr
			}
			return sqlDB.Close()
		},
	}, nil
}
