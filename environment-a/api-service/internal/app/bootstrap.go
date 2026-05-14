package app

import (
	"context"
	"fmt"

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
	adminRepo := repository.NewAdminRepository(gormDB)
	insightRepo := repository.NewInsightRepository(gormDB)

	authService := service.NewAuthService(authRepo, activityRepo, cfg.SessionTTLMinutes)
	adminService := service.NewAdminService(adminRepo)
	activityService := service.NewActivityService(activityRepo)
	directoryService := service.NewDirectoryService(directoryRepo, activityRepo)
	fileService := service.NewFileService(fileRepo, directoryRepo, activityRepo, vault)
	insightService := service.NewInsightService(insightRepo)
	systemService := service.NewSystemService(sqlDB, vault, cfg.AppEnv)

	api := httptransport.NewAPI(cfg, authService, adminService, activityService, directoryService, fileService, insightService, systemService)
	router := httptransport.NewRouter(cfg, api, authService)

	return &App{
		Router: router,
		Close:  sqlDB.Close,
	}, nil
}
