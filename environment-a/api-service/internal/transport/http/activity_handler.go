package httptransport

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/alfiang/pui/environment-a/api-service/internal/transport/http/dto"
	"github.com/gin-gonic/gin"
)

// handleActivityLogs godoc
// @Summary Riwayat aktivitas
// @Description Menampilkan riwayat aktivitas pengguna saat ini dengan filter dan pagination opsional
// @Tags aktivitas
// @Security BearerAuth
// @Produce json
// @Param action query string false "Filter berdasarkan aksi"
// @Param resource_type query string false "Filter berdasarkan tipe resource"
// @Param limit query int false "Ukuran halaman (1-200, default 20)"
// @Param offset query int false "Offset (default 0)"
// @Success 200 {object} dto.ActivityLogListResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /activity-logs [get]
func (a *API) handleActivityLogs(c *gin.Context) {
	user, ok := a.authUser(c)
	if !ok {
		return
	}

	action := strings.TrimSpace(c.Query("action"))
	resourceType := strings.TrimSpace(c.Query("resource_type"))

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

	records, total, normalizedLimit, normalizedOffset, err := a.activityService.List(
		c.Request.Context(),
		user,
		action,
		resourceType,
		limit,
		offset,
	)
	if err != nil {
		writeError(c, statusFromError(err), err)
		return
	}

	c.JSON(http.StatusOK, dto.ActivityLogListResponse{
		Status:       "ok",
		Total:        total,
		Limit:        normalizedLimit,
		Offset:       normalizedOffset,
		ActivityLogs: toActivityLogDTOs(records),
	})
}

func parseIntQuery(raw string, fallback int) (int, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return fallback, nil
	}

	value, err := strconv.Atoi(trimmed)
	if err != nil {
		return 0, err
	}

	return value, nil
}

func parsePaginationQuery(c *gin.Context) (int, int, error) {
	limit, err := parseIntQuery(c.Query("limit"), 0)
	if err != nil {
		return 0, 0, fmt.Errorf("limit harus berupa angka")
	}

	offset, err := parseIntQuery(c.Query("offset"), 0)
	if err != nil {
		return 0, 0, fmt.Errorf("offset harus berupa angka")
	}

	return limit, offset, nil
}

func parseOptionalTime(raw string) (*time.Time, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return nil, nil
	}

	value, err := time.Parse(time.RFC3339, trimmed)
	if err != nil {
		return nil, fmt.Errorf("waktu harus menggunakan format RFC3339")
	}

	return &value, nil
}
