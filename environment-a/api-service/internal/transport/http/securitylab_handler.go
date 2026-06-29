package httptransport

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/alfiang/pui/environment-a/api-service/internal/service"
	"github.com/gin-gonic/gin"
)

// handleSecurityLabRun godoc
// @Summary Jalankan simulasi mitigasi ransomware (Security Lab)
// @Description Menjalankan skenario serangan ransomware 5-fase dan mengalirkan setiap langkah sebagai Server-Sent Events. Hanya aktif saat SECURITY_LAB_ENABLED=true. Setiap event berisi data faktual dari respons sistem nyata.
// @Tags security-lab
// @Security BearerAuth
// @Produce text/event-stream
// @Success 200 {string} string "Stream event SSE"
// @Failure 401 {object} dto.ErrorResponse
// @Failure 404 {object} dto.ErrorResponse
// @Router /security-lab/run [get]
func (a *API) handleSecurityLabRun(c *gin.Context) {
	user, ok := a.authUser(c)
	if !ok {
		return
	}

	// Hard gate: when disabled, behave as if the endpoint does not exist so it
	// leaves no attack surface outside the demo/skripsi environment.
	if !a.cfg.SecurityLabEnabled || a.securityLabService == nil {
		writeError(c, http.StatusNotFound, fmt.Errorf("security lab tidak aktif"))
		return
	}

	// Server-Sent Events headers.
	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("X-Accel-Buffering", "no") // disable proxy buffering (nginx)
	c.Writer.WriteHeader(http.StatusOK)

	flusher, canFlush := c.Writer.(http.Flusher)
	if canFlush {
		flusher.Flush()
	}

	writeFrame := func(event string, payload any) {
		data, err := json.Marshal(payload)
		if err != nil {
			return
		}
		// SSE frame: named event + JSON data line.
		_, _ = fmt.Fprintf(c.Writer, "event: %s\ndata: %s\n\n", event, data)
		if canFlush {
			flusher.Flush()
		}
	}

	ctx := c.Request.Context()
	emit := func(e service.SecurityLabEvent) {
		// Stop emitting if the client disconnected.
		select {
		case <-ctx.Done():
			return
		default:
		}
		writeFrame("phase", e)
	}

	summary, err := a.securityLabService.Run(ctx, user, emit)
	if err != nil {
		writeFrame("error", gin.H{"status": "error", "error": err.Error(), "summary": summary})
		return
	}

	writeFrame("summary", summary)
	writeFrame("done", gin.H{"status": "ok"})
}
