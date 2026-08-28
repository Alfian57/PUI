package httptransport

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"github.com/gin-gonic/gin"
)

type fakeSecurityMonitoringService struct {
	items   []domain.SecurityEventRecord
	summary domain.SecurityEventSummary
}

func (f *fakeSecurityMonitoringService) List(_ context.Context, _ domain.SecurityEventFilter) ([]domain.SecurityEventRecord, int64, int, int, error) {
	return f.items, int64(len(f.items)), 25, 0, nil
}

func (f *fakeSecurityMonitoringService) Summary(_ context.Context, _, _ time.Time) (domain.SecurityEventSummary, error) {
	return f.summary, nil
}

func (f *fakeSecurityMonitoringService) Subscribe() (<-chan domain.SecurityEventRecord, func()) {
	return make(chan domain.SecurityEventRecord), func() {}
}

func TestHandleAdminSecurityEventsReturnsSanitizedDTO(t *testing.T) {
	service := &fakeSecurityMonitoringService{items: []domain.SecurityEventRecord{{
		ID: "event-1", EventType: domain.SecurityEventVaultPolicyBlocked, Source: domain.SecuritySourceVault,
		Severity: domain.SecuritySeverityHigh, Outcome: domain.SecurityOutcomeBlocked,
		Method: http.MethodDelete, Path: "/internal/v1/manifests/demo", StatusCode: http.StatusForbidden,
		ErrorCode: "operation_forbidden", OccurredAt: time.Now().UTC(),
	}}}
	api := &API{securityMonitoringService: service}
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/admin/security-monitor/events?range=24h", nil)
	injectUser(c)

	api.handleAdminSecurityEvents(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	for _, expected := range []string{"security_events", "VAULT_OPERATION_BLOCKED", "operation_forbidden", "403"} {
		if !contains(w.Body.String(), expected) {
			t.Errorf("expected response to contain %q: %s", expected, w.Body.String())
		}
	}
}

func TestHandleAdminSecurityEventSummaryValidatesRange(t *testing.T) {
	api := &API{securityMonitoringService: &fakeSecurityMonitoringService{}}
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/admin/security-monitor/summary?range=365d", nil)
	injectUser(c)

	api.handleAdminSecurityEventSummary(c)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func contains(value, expected string) bool {
	for i := 0; i+len(expected) <= len(value); i++ {
		if value[i:i+len(expected)] == expected {
			return true
		}
	}
	return false
}
