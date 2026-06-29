package httptransport

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/alfiang/pui/environment-a/api-service/internal/config"
	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"github.com/alfiang/pui/environment-a/api-service/internal/service"
	"github.com/gin-gonic/gin"
)

type fakeSecurityLab struct {
	events  []service.SecurityLabEvent
	summary service.SecurityLabSummary
}

func (f *fakeSecurityLab) Run(_ context.Context, _ domain.AuthUser, emit service.EmitFunc) (service.SecurityLabSummary, error) {
	for _, e := range f.events {
		emit(e)
	}
	return f.summary, nil
}

func newSecurityAPI(enabled bool, lab securityLabServiceInterface) *API {
	return &API{
		cfg:                config.Config{SecurityLabEnabled: enabled},
		securityLabService: lab,
	}
}

func TestHandleSecurityLabRunDisabledReturns404(t *testing.T) {
	t.Parallel()

	api := newSecurityAPI(false, &fakeSecurityLab{})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/security-lab/run", nil)
	injectUser(c)

	api.handleSecurityLabRun(c)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404 when disabled, got %d: %s", w.Code, w.Body.String())
	}
}

func TestHandleSecurityLabRunStreamsEvents(t *testing.T) {
	t.Parallel()

	lab := &fakeSecurityLab{
		events: []service.SecurityLabEvent{
			{Phase: service.SecurityPhaseBefore, Step: "upload", Status: service.SecurityStatusOK, Title: "ok"},
			{Phase: service.SecurityPhaseAttackUDS, Step: "attack_DELETE", Status: service.SecurityStatusBlocked, Title: "blocked",
				Data: map[string]any{"error_code": "operation_forbidden"}},
		},
		summary: service.SecurityLabSummary{Passed: true, ManifestID: "m1"},
	}
	api := newSecurityAPI(true, lab)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/security-lab/run", nil)
	injectUser(c)

	api.handleSecurityLabRun(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	if ct := w.Header().Get("Content-Type"); !strings.HasPrefix(ct, "text/event-stream") {
		t.Fatalf("expected SSE content type, got %q", ct)
	}

	body := w.Body.String()
	for _, want := range []string{
		"event: phase",
		"operation_forbidden",
		"event: summary",
		"event: done",
		`"passed":true`,
	} {
		if !strings.Contains(body, want) {
			t.Errorf("expected SSE body to contain %q\n---body---\n%s", want, body)
		}
	}
}
