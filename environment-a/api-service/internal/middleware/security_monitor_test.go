package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"github.com/gin-gonic/gin"
)

type recordingSecurityEventSink struct {
	inputs []domain.SecurityEventInput
}

func (r *recordingSecurityEventSink) Record(_ context.Context, input domain.SecurityEventInput) (domain.SecurityEventRecord, error) {
	r.inputs = append(r.inputs, input)
	return domain.SecurityEventRecord{ID: "event-1"}, nil
}

func TestSecurityMonitorClassifiesLoginFailure(t *testing.T) {
	gin.SetMode(gin.TestMode)
	sink := &recordingSecurityEventSink{}
	router := gin.New()
	router.Use(SecurityMonitor(sink))
	router.POST("/api/v1/auth/login", func(c *gin.Context) { c.Status(http.StatusUnauthorized) })

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", nil)
	req.RemoteAddr = "192.0.2.10:1234"
	response := httptest.NewRecorder()
	router.ServeHTTP(response, req)

	if response.Code != http.StatusUnauthorized || len(sink.inputs) != 1 {
		t.Fatalf("expected one recorded login failure, status=%d events=%d", response.Code, len(sink.inputs))
	}
	event := sink.inputs[0]
	if event.EventType != domain.SecurityEventFailedLogin || event.Outcome != domain.SecurityOutcomeDetected || event.ClientIP != "192.0.2.10" {
		t.Fatalf("unexpected login failure event: %+v", event)
	}
}

func TestSecurityMonitorSkipsSuccessfulAndHealthRequests(t *testing.T) {
	gin.SetMode(gin.TestMode)
	sink := &recordingSecurityEventSink{}
	router := gin.New()
	router.Use(SecurityMonitor(sink))
	router.GET("/api/v1/health", func(c *gin.Context) { c.Status(http.StatusUnauthorized) })
	router.GET("/api/v1/normal", func(c *gin.Context) { c.Status(http.StatusOK) })

	for _, path := range []string{"/api/v1/health", "/api/v1/normal"} {
		response := httptest.NewRecorder()
		router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, path, nil))
	}
	if len(sink.inputs) != 0 {
		t.Fatalf("expected no events, got %+v", sink.inputs)
	}
}
