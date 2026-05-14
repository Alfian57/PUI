package httptransport

import (
	"fmt"
	"net/http"

	"github.com/alfiang/pui/environment-a/api-service/internal/service"
	"github.com/gin-gonic/gin"
)

func (a *API) handleUserInsight(c *gin.Context) {
	user, ok := a.authUser(c)
	if !ok {
		return
	}

	insight, err := a.insightService.UserInsight(c.Request.Context(), user, c.Query("range"))
	if err != nil {
		writeError(c, statusFromError(err), err)
		return
	}

	c.JSON(http.StatusOK, toUserInsightResponse(insight))
}

func (a *API) handleUserInsightReport(c *gin.Context) {
	user, ok := a.authUser(c)
	if !ok {
		return
	}

	insight, err := a.insightService.UserInsight(c.Request.Context(), user, c.Query("range"))
	if err != nil {
		writeError(c, statusFromError(err), err)
		return
	}

	report, err := service.BuildUserInsightReport(c.Query("format"), insight)
	if err != nil {
		writeError(c, statusFromError(err), err)
		return
	}

	writeReport(c, report)
}

func writeReport(c *gin.Context, report service.ReportFile) {
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, report.FileName))
	c.Data(http.StatusOK, report.ContentType, report.Body)
}
