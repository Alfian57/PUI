package httptransport

import (
	"time"

	"github.com/alfiang/pui/environment-a/api-service/internal/config"
	"github.com/alfiang/pui/environment-a/api-service/internal/middleware"
	"github.com/alfiang/pui/environment-a/api-service/internal/service"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"

	"github.com/gin-gonic/gin"
)

func NewRouter(cfg config.Config, api *API, authService *service.AuthService) *gin.Engine {
	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(middleware.CORS(cfg.AllowedOrigin))
	router.Use(middleware.NewRateLimiter(cfg.RateLimitPerMinute, time.Minute).Middleware())

	v1 := router.Group("/api/v1")
	{
		v1.GET("/health", api.handleHealth)
		v1.GET("/status", api.handleStatus)
		v1.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

		v1.POST("/auth/login", api.handleLogin)

		authorized := v1.Group("")
		authorized.Use(middleware.Auth(authService))
		{
			authorized.POST("/auth/logout", api.handleLogout)
			authorized.GET("/auth/me", api.handleMe)

			authorized.POST("/directories", api.handleCreateDirectory)
			authorized.GET("/directories/tree", api.handleDirectoryTree)
			authorized.GET("/directories/:id/files", api.handleDirectoryFiles)
			authorized.GET("/directories/:id/breadcrumb", api.handleDirectoryBreadcrumb)

			authorized.POST("/files", api.handleUploadFile)
			authorized.GET("/files/:id/download", api.handleDownloadFile)
			authorized.GET("/files/:id", api.handleFileDetail)
			authorized.DELETE("/files/:id", api.handleSoftDeleteFile)
		}
	}

	return router
}
