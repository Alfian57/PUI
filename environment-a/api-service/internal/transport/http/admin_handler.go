package httptransport

import (
	"net/http"

	"github.com/alfiang/pui/environment-a/api-service/internal/service"
	"github.com/gin-gonic/gin"
)

// handleAdminAnalytics godoc
// @Summary Analitik admin
// @Description Menampilkan analitik aplikasi agregat dan aman privasi untuk admin
// @Tags admin
// @Security BearerAuth
// @Produce json
// @Param range query string false "Rentang analitik: 7d, 30d, atau 90d"
// @Success 200 {object} dto.AdminAnalyticsResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 403 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /admin/analytics [get]
func (a *API) handleAdminAnalytics(c *gin.Context) {
	user, ok := a.authUser(c)
	if !ok {
		return
	}

	analytics, err := a.adminService.Analytics(c.Request.Context(), user, c.Query("range"))
	if err != nil {
		writeError(c, statusFromError(err), err)
		return
	}

	c.JSON(http.StatusOK, toAdminAnalyticsResponse(analytics))
}

func (a *API) handleAdminAnalyticsReport(c *gin.Context) {
	user, ok := a.authUser(c)
	if !ok {
		return
	}

	analytics, err := a.adminService.Analytics(c.Request.Context(), user, c.Query("range"))
	if err != nil {
		writeError(c, statusFromError(err), err)
		return
	}

	report, err := service.BuildAdminAnalyticsReport(c.Query("format"), analytics)
	if err != nil {
		writeError(c, statusFromError(err), err)
		return
	}

	writeReport(c, report)
}

func (a *API) handleAdminSystem(c *gin.Context) {
	status := a.systemService.Status(c.Request.Context())
	c.JSON(http.StatusOK, gin.H{
		"status":                status.Status,
		"database":              status.Database,
		"vault_core":            status.VaultCore,
		"environment":           a.cfg.AppEnv,
		"max_upload_size_bytes": a.cfg.MaxUploadSizeBytes,
		"rate_limit_per_minute": a.cfg.RateLimitPerMinute,
		"session_ttl_minutes":   a.cfg.SessionTTLMinutes,
		"checked_at":            status.CheckedAt.Format("2006-01-02T15:04:05Z07:00"),
	})
}
