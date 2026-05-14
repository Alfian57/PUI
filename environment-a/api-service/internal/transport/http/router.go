package httptransport

import (
	"time"

	"github.com/alfiang/pui/environment-a/api-service/internal/config"
	"github.com/alfiang/pui/environment-a/api-service/internal/middleware"
	"github.com/alfiang/pui/environment-a/api-service/internal/service"

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
		v1.GET("/swagger/*any", brandedSwaggerHandler())

		v1.POST("/auth/login", api.handleLogin)
		v1.POST("/auth/register", api.handleRegister)

		authorized := v1.Group("")
		authorized.Use(middleware.Auth(authService))
		{
			authorized.POST("/auth/logout", api.handleLogout)
			authorized.GET("/auth/me", api.handleMe)
			authorized.PATCH("/auth/me", api.handleUpdateProfile)

			admin := authorized.Group("/admin")
			admin.Use(middleware.RequireRole("admin"))
			{
				admin.GET("/analytics", api.handleAdminAnalytics)
				admin.GET("/reports/analytics", api.handleAdminAnalyticsReport)
				admin.GET("/system", api.handleAdminSystem)
			}

			userRoutes := authorized.Group("")
			userRoutes.Use(middleware.RequireRole("user"))
			{
				userRoutes.GET("/activity-logs", api.handleActivityLogs)
				userRoutes.GET("/insights", api.handleUserInsight)
				userRoutes.GET("/reports/insight", api.handleUserInsightReport)
				userRoutes.GET("/trash", api.handleTrash)
				userRoutes.GET("/starred", api.handleStarred)

				userRoutes.POST("/directories", api.handleCreateDirectory)
				userRoutes.GET("/directories/tree", api.handleDirectoryTree)
				userRoutes.GET("/directories/:id/files", api.handleDirectoryFiles)
				userRoutes.GET("/directories/:id/breadcrumb", api.handleDirectoryBreadcrumb)
				userRoutes.POST("/directories/:id/restore", api.handleRestoreDirectory)
				userRoutes.PUT("/directories/:id/star", api.handleStarDirectory)
				userRoutes.DELETE("/directories/:id/star", api.handleUnstarDirectory)
				userRoutes.DELETE("/directories/:id/permanent", api.handlePermanentDeleteDirectory)
				userRoutes.DELETE("/directories/:id", api.handleSoftDeleteDirectory)

				userRoutes.POST("/files", api.handleUploadFile)
				userRoutes.GET("/files", api.handleListFiles)
				userRoutes.GET("/files/search", api.handleSearchFiles)
				userRoutes.POST("/files/:id/restore", api.handleRestoreFile)
				userRoutes.PUT("/files/:id/star", api.handleStarFile)
				userRoutes.DELETE("/files/:id/star", api.handleUnstarFile)
				userRoutes.DELETE("/files/:id/permanent", api.handlePermanentDeleteFile)
				userRoutes.GET("/files/:id/download", api.handleDownloadFile)
				userRoutes.GET("/files/:id/manifest", api.handleFileManifest)
				userRoutes.GET("/files/:id", api.handleFileDetail)
				userRoutes.DELETE("/files/:id", api.handleSoftDeleteFile)
			}
		}
	}

	return router
}
