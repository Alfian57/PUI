package middleware

import (
	"context"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"github.com/gin-gonic/gin"
)

// SecurityMonitor records security-relevant HTTP outcomes after all inner
// middleware and handlers have completed. It intentionally records metadata
// only; request bodies and Authorization headers never enter the event model.
func SecurityMonitor(recorder interface {
	Record(context.Context, domain.SecurityEventInput) (domain.SecurityEventRecord, error)
}) gin.HandlerFunc {
	return func(c *gin.Context) {
		if recorder == nil {
			c.Next()
			return
		}
		startedAt := time.Now()
		c.Next()

		if c.Request.Method == http.MethodOptions || shouldSkipSecurityMonitoring(c.Request.URL.Path) {
			return
		}

		statusCode := c.Writer.Status()
		if statusCode != http.StatusUnauthorized && statusCode != http.StatusForbidden && statusCode != http.StatusTooManyRequests {
			return
		}

		eventType := domain.SecurityEventForbidden
		severity := domain.SecuritySeverityHigh
		outcome := domain.SecurityOutcomeBlocked
		switch statusCode {
		case http.StatusUnauthorized:
			eventType = domain.SecurityEventUnauthorized
			severity = domain.SecuritySeverityMedium
			outcome = domain.SecurityOutcomeDetected
			if c.Request.Method == http.MethodPost && strings.HasSuffix(c.Request.URL.Path, "/auth/login") {
				eventType = domain.SecurityEventFailedLogin
			}
		case http.StatusTooManyRequests:
			eventType = domain.SecurityEventRateLimitBlocked
		}

		userID := ""
		if user, ok := MustAuthUser(c); ok {
			userID = user.UserID
		}

		ctx, cancel := context.WithTimeout(context.WithoutCancel(c.Request.Context()), 2*time.Second)
		defer cancel()
		_, err := recorder.Record(ctx, domain.SecurityEventInput{
			EventType:  eventType,
			Source:     domain.SecuritySourceAPI,
			Severity:   severity,
			Outcome:    outcome,
			UserID:     userID,
			ClientIP:   clientIP(c),
			Method:     c.Request.Method,
			Path:       c.Request.URL.Path,
			StatusCode: statusCode,
			Details: map[string]any{
				"duration_ms": time.Since(startedAt).Milliseconds(),
			},
		})
		if err != nil {
			log.Printf("event=security_http_event_failed method=%s path=%s status=%d err=%v", c.Request.Method, c.Request.URL.Path, statusCode, err)
		}
	}
}

func shouldSkipSecurityMonitoring(path string) bool {
	return path == "/api/v1/health" || strings.HasPrefix(path, "/api/v1/swagger/")
}
