package httptransport

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// handleHealth godoc
// @Summary Health check
// @Description Public liveness probe for API service
// @Tags system
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /health [get]
func (a *API) handleHealth(c *gin.Context) {
	c.JSON(http.StatusOK, a.systemService.Health())
}

// handleStatus godoc
// @Summary Dependency status
// @Description Reports database and vault-core availability
// @Tags system
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /status [get]
func (a *API) handleStatus(c *gin.Context) {
	status := a.systemService.Status(c.Request.Context())
	c.JSON(http.StatusOK, gin.H{
		"status":     status.Status,
		"database":   status.Database,
		"vault_core": status.VaultCore,
		"timestamp":  status.CheckedAt,
	})
}
