package httptransport

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func newTestAPI() *API {
	return &API{
		validator: validator.New(validator.WithRequiredStructEnabled()),
	}
}

func TestHandleLoginRejectsMalformedJSON(t *testing.T) {
	t.Parallel()

	api := newTestAPI()
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/auth/login", bytes.NewBufferString("not-json"))
	c.Request.Header.Set("Content-Type", "application/json")

	api.handleLogin(c)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

func TestHandleRegisterRejectsMalformedJSON(t *testing.T) {
	t.Parallel()

	api := newTestAPI()
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/auth/register", bytes.NewBufferString("{bad}"))
	c.Request.Header.Set("Content-Type", "application/json")

	api.handleRegister(c)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

func TestHandleLogoutRejectsUnauthenticated(t *testing.T) {
	t.Parallel()

	api := newTestAPI()
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/auth/logout", nil)

	// No auth user in context
	api.handleLogout(c)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestHandleMeRejectsUnauthenticated(t *testing.T) {
	t.Parallel()

	api := newTestAPI()
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/auth/me", nil)

	api.handleMe(c)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestHandleUpdateProfileRejectsUnauthenticated(t *testing.T) {
	t.Parallel()

	api := newTestAPI()
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPatch, "/auth/me", nil)

	api.handleUpdateProfile(c)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestStatusFromError(t *testing.T) {
	t.Parallel()

	cases := []struct {
		err    error
		status int
	}{
		{domain.ErrUnauthorized, http.StatusUnauthorized},
		{domain.ErrForbidden, http.StatusForbidden},
		{domain.ErrConflict, http.StatusConflict},
		{domain.ErrNotFound, http.StatusNotFound},
		{domain.ErrInvalidInput, http.StatusBadRequest},
		{domain.NewValidationError("bad"), http.StatusBadRequest},
		{domain.ErrUploadTooBig, http.StatusRequestEntityTooLarge},
		{errors.New("unknown"), http.StatusInternalServerError},
	}

	for _, tc := range cases {
		got := statusFromError(tc.err)
		if got != tc.status {
			t.Errorf("statusFromError(%v) = %d, want %d", tc.err, got, tc.status)
		}
	}
}

func TestParseBoolQuery(t *testing.T) {
	t.Parallel()

	if !parseBoolQuery("true") || !parseBoolQuery("TRUE") || !parseBoolQuery("True") {
		t.Fatal("expected true for truthy strings")
	}
	if parseBoolQuery("false") || parseBoolQuery("") || parseBoolQuery("1") {
		t.Fatal("expected false for non-'true' strings")
	}
}

func TestReadBearerToken(t *testing.T) {
	t.Parallel()

	cases := []struct {
		header string
		want   string
	}{
		{"Bearer token123", "token123"},
		{"bearer token123", "token123"},
		{"", ""},
		{"Basic creds", ""},
		{"Bearer", ""},
	}
	for _, tc := range cases {
		got := readBearerToken(tc.header)
		if got != tc.want {
			t.Errorf("readBearerToken(%q) = %q, want %q", tc.header, got, tc.want)
		}
	}
}

func TestWriteError(t *testing.T) {
	t.Parallel()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/", nil)

	writeError(c, http.StatusBadRequest, errors.New("some error"))

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
	var body map[string]any
	if err := json.NewDecoder(w.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if body["status"] != "error" {
		t.Fatalf("expected status=error, got %v", body["status"])
	}
}
