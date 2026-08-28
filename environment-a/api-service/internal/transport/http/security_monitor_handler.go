package httptransport

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"github.com/alfiang/pui/environment-a/api-service/internal/transport/http/dto"
	"github.com/gin-gonic/gin"
)

// handleAdminSecurityEventSummary godoc
// @Summary Ringkasan monitoring keamanan
// @Description Menampilkan jumlah event keamanan dan sesi Security Lab untuk admin
// @Tags security-monitor
// @Security BearerAuth
// @Produce json
// @Param range query string false "Rentang: 24h, 7d, atau 30d"
// @Success 200 {object} dto.SecurityEventSummaryResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 403 {object} dto.ErrorResponse
// @Router /admin/security-monitor/summary [get]
func (a *API) handleAdminSecurityEventSummary(c *gin.Context) {
	if _, ok := a.authUser(c); !ok {
		return
	}
	if a.securityMonitoringService == nil {
		writeError(c, http.StatusServiceUnavailable, fmt.Errorf("security monitoring tidak tersedia"))
		return
	}

	rangeLabel, since, until, err := securityRange(c.Query("range"))
	if err != nil {
		writeError(c, http.StatusBadRequest, err)
		return
	}
	summary, err := a.securityMonitoringService.Summary(c.Request.Context(), since, until)
	if err != nil {
		writeError(c, http.StatusInternalServerError, err)
		return
	}
	c.JSON(http.StatusOK, dto.SecurityEventSummaryResponse{
		Status: "ok", Range: rangeLabel, GeneratedAt: time.Now().UTC().Format(time.RFC3339),
		TotalEvents: summary.TotalEvents, Detected: summary.Detected, Blocked: summary.Blocked,
		Breaches: summary.Breaches, SecurityLabRuns: summary.SecurityLabRuns, LastEventAt: summary.LastEventAt,
	})
}

// handleAdminSecurityEvents godoc
// @Summary Histori event keamanan
// @Description Menampilkan event keamanan tersimpan dengan filter dan pagination
// @Tags security-monitor
// @Security BearerAuth
// @Produce json
// @Param range query string false "Rentang: 24h, 7d, atau 30d"
// @Param event_type query string false "Filter tipe event"
// @Param source query string false "Filter sumber event"
// @Param outcome query string false "Filter hasil event"
// @Param run_id query string false "Filter sesi Security Lab"
// @Param limit query int false "Ukuran halaman (1-100, default 25)"
// @Param offset query int false "Offset (default 0)"
// @Success 200 {object} dto.SecurityEventListResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 403 {object} dto.ErrorResponse
// @Router /admin/security-monitor/events [get]
func (a *API) handleAdminSecurityEvents(c *gin.Context) {
	if _, ok := a.authUser(c); !ok {
		return
	}
	if a.securityMonitoringService == nil {
		writeError(c, http.StatusServiceUnavailable, fmt.Errorf("security monitoring tidak tersedia"))
		return
	}

	_, since, until, err := securityRange(c.Query("range"))
	if err != nil {
		writeError(c, http.StatusBadRequest, err)
		return
	}
	limit, err := parseIntQuery(c.Query("limit"), 0)
	if err != nil {
		writeError(c, http.StatusBadRequest, fmt.Errorf("limit harus berupa angka"))
		return
	}
	offset, err := parseIntQuery(c.Query("offset"), 0)
	if err != nil {
		writeError(c, http.StatusBadRequest, fmt.Errorf("offset harus berupa angka"))
		return
	}

	items, total, normalizedLimit, normalizedOffset, err := a.securityMonitoringService.List(c.Request.Context(), domain.SecurityEventFilter{
		Since: since, Until: until,
		EventType: strings.ToUpper(strings.TrimSpace(c.Query("event_type"))),
		Source:    strings.ToLower(strings.TrimSpace(c.Query("source"))),
		Outcome:   strings.ToLower(strings.TrimSpace(c.Query("outcome"))),
		RunID:     strings.TrimSpace(c.Query("run_id")),
		Limit:     limit, Offset: offset,
	})
	if err != nil {
		writeError(c, statusFromError(err), err)
		return
	}
	c.JSON(http.StatusOK, dto.SecurityEventListResponse{
		Status: "ok", Total: total, Limit: normalizedLimit, Offset: normalizedOffset,
		SecurityEvents: toSecurityEventDTOs(items),
	})
}

// handleAdminSecurityEventStream godoc
// @Summary Stream monitoring keamanan
// @Description Mengalirkan event keamanan baru secara real-time melalui SSE untuk admin
// @Tags security-monitor
// @Security BearerAuth
// @Produce text/event-stream
// @Success 200 {string} string "Stream event SSE"
// @Failure 401 {object} dto.ErrorResponse
// @Failure 403 {object} dto.ErrorResponse
// @Router /admin/security-monitor/stream [get]
func (a *API) handleAdminSecurityEventStream(c *gin.Context) {
	if _, ok := a.authUser(c); !ok {
		return
	}
	if a.securityMonitoringService == nil {
		writeError(c, http.StatusServiceUnavailable, fmt.Errorf("security monitoring tidak tersedia"))
		return
	}

	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("X-Accel-Buffering", "no")
	c.Writer.WriteHeader(http.StatusOK)
	flusher, canFlush := c.Writer.(http.Flusher)
	if canFlush {
		flusher.Flush()
	}

	events, unsubscribe := a.securityMonitoringService.Subscribe()
	defer unsubscribe()
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-c.Request.Context().Done():
			return
		case event, open := <-events:
			if !open {
				return
			}
			data, err := json.Marshal(toSecurityEventDTO(event))
			if err != nil {
				continue
			}
			_, _ = fmt.Fprintf(c.Writer, "event: security_event\ndata: %s\n\n", data)
			if canFlush {
				flusher.Flush()
			}
		case <-ticker.C:
			_, _ = fmt.Fprint(c.Writer, ": heartbeat\n\n")
			if canFlush {
				flusher.Flush()
			}
		}
	}
}

func securityRange(raw string) (string, time.Time, time.Time, error) {
	label := strings.ToLower(strings.TrimSpace(raw))
	if label == "" {
		label = "24h"
	}
	var duration time.Duration
	switch label {
	case "24h":
		duration = 24 * time.Hour
	case "7d":
		duration = 7 * 24 * time.Hour
	case "30d":
		duration = 30 * 24 * time.Hour
	default:
		return "", time.Time{}, time.Time{}, fmt.Errorf("range harus 24h, 7d, atau 30d")
	}
	now := time.Now().UTC()
	return label, now.Add(-duration), now, nil
}
