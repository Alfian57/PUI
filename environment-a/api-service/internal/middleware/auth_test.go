package middleware

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"github.com/gin-gonic/gin"
)


func TestMustAuthUserWrongType(t *testing.T) {
	t.Parallel()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/", nil)

	// Inject value with wrong type — should return false
	c.Set("auth_user", "not-a-struct")

	_, ok := MustAuthUser(c)
	if ok {
		t.Fatal("expected MustAuthUser to return false for wrong type")
	}
}

func init() {
	gin.SetMode(gin.TestMode)
}

// fakeAuthValidator implements authTokenValidator for testing Auth middleware.
type fakeAuthValidator struct {
	user domain.AuthUser
	err  error
}

func (f *fakeAuthValidator) AuthenticateToken(_ context.Context, _ string) (domain.AuthUser, error) {
	return f.user, f.err
}

func TestAuthMiddlewareRejectsMissingToken(t *testing.T) {
	t.Parallel()

	handler := Auth(&fakeAuthValidator{})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/", nil)

	handler(c)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
	if !c.IsAborted() {
		t.Fatal("expected request to be aborted")
	}
}

func TestAuthMiddlewareRejectsInvalidToken(t *testing.T) {
	t.Parallel()

	handler := Auth(&fakeAuthValidator{err: domain.ErrUnauthorized})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/", nil)
	c.Request.Header.Set("Authorization", "Bearer invalid-token")

	handler(c)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
	if !c.IsAborted() {
		t.Fatal("expected request to be aborted")
	}
}

func TestAuthMiddlewareInternalError(t *testing.T) {
	t.Parallel()

	handler := Auth(&fakeAuthValidator{err: errors.New("db error")})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/", nil)
	c.Request.Header.Set("Authorization", "Bearer some-token")

	handler(c)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", w.Code)
	}
}

func TestAuthMiddlewareAllowsValidToken(t *testing.T) {
	t.Parallel()

	expectedUser := domain.AuthUser{UserID: "uid", Role: "user"}
	handler := Auth(&fakeAuthValidator{user: expectedUser})

	nextCalled := false
	router := gin.New()
	router.Use(handler)
	router.GET("/protected", func(c *gin.Context) {
		nextCalled = true
		user, ok := MustAuthUser(c)
		if !ok || user.UserID != expectedUser.UserID {
			c.Status(http.StatusInternalServerError)
			return
		}
		c.Status(http.StatusOK)
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer valid-token")
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	if !nextCalled {
		t.Fatal("expected next handler to be called")
	}
}

func TestExtractBearerToken(t *testing.T) {
	t.Parallel()

	cases := []struct {
		header string
		want   string
	}{
		{"Bearer abc123", "abc123"},
		{"bearer abc123", "abc123"},
		{"BEARER abc123", "abc123"},
		{"  Bearer  abc123  ", "abc123"},
		{"", ""},
		{"Basic abc123", ""},
		{"Beareronly", ""},
		{"Bearer", ""},
		{"Bearer ", ""},
	}

	for _, tc := range cases {
		got := extractBearerToken(tc.header)
		if got != tc.want {
			t.Errorf("extractBearerToken(%q) = %q, want %q", tc.header, got, tc.want)
		}
	}
}

func TestRequireRoleAllowsMatchingRole(t *testing.T) {
	t.Parallel()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/", nil)

	SetAuthUser(c, domain.AuthUser{UserID: "uid", Role: "admin"})

	handler := RequireRole("admin")
	handler(c)

	if c.IsAborted() {
		t.Fatal("expected request to proceed, was aborted")
	}
}

func TestRequireRoleRejectsMismatchedRole(t *testing.T) {
	t.Parallel()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/", nil)

	SetAuthUser(c, domain.AuthUser{UserID: "uid", Role: "user"})

	handler := RequireRole("admin")
	handler(c)

	if !c.IsAborted() {
		t.Fatal("expected request to be aborted for wrong role")
	}
	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", w.Code)
	}
}

func TestRequireRoleRejectsUnauthenticated(t *testing.T) {
	t.Parallel()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/", nil)

	// No auth user set in context
	handler := RequireRole("admin")
	handler(c)

	if !c.IsAborted() {
		t.Fatal("expected request to be aborted when no auth user")
	}
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}
