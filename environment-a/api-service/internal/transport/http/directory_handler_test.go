package httptransport

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"github.com/alfiang/pui/environment-a/api-service/internal/service"
	"github.com/alfiang/pui/environment-a/api-service/internal/vaultclient"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// ---- fake service implementations ----

type fakeDirSvc struct {
	record  domain.DirectoryRecord
	records []domain.DirectoryRecord
	err     error
}

func (f *fakeDirSvc) Create(_ context.Context, _ domain.AuthUser, name, _ string) (domain.DirectoryRecord, error) {
	return domain.DirectoryRecord{ID: "d1", Name: name}, f.err
}
func (f *fakeDirSvc) Tree(_ context.Context, _ domain.AuthUser, _ string) ([]domain.DirectoryRecord, error) {
	return f.records, f.err
}
func (f *fakeDirSvc) Breadcrumb(_ context.Context, _ domain.AuthUser, _ string) ([]domain.DirectoryRecord, error) {
	return f.records, f.err
}
func (f *fakeDirSvc) SoftDelete(_ context.Context, _ domain.AuthUser, _ string) (domain.DirectoryRecord, error) {
	return f.record, f.err
}
func (f *fakeDirSvc) Restore(_ context.Context, _ domain.AuthUser, _ string) (domain.DirectoryRecord, error) {
	return f.record, f.err
}
func (f *fakeDirSvc) PermanentDelete(_ context.Context, _ domain.AuthUser, _ string) error {
	return f.err
}
func (f *fakeDirSvc) SetStarred(_ context.Context, _ domain.AuthUser, _ string, _ bool) (domain.DirectoryRecord, error) {
	return f.record, f.err
}
func (f *fakeDirSvc) Trash(_ context.Context, _ domain.AuthUser) ([]domain.DirectoryRecord, error) {
	return f.records, f.err
}
func (f *fakeDirSvc) Starred(_ context.Context, _ domain.AuthUser) ([]domain.DirectoryRecord, error) {
	return f.records, f.err
}

type fakeFileSvc struct {
	records []domain.FileRecord
	err     error
}

func (f *fakeFileSvc) ListByDirectory(_ context.Context, _ domain.AuthUser, _ string, _ bool) ([]domain.FileRecord, error) {
	return f.records, f.err
}
func (f *fakeFileSvc) Upload(_ context.Context, _ domain.AuthUser, _, _, _ string, _ io.Reader) (service.UploadOutcome, error) {
	return service.UploadOutcome{}, f.err
}
func (f *fakeFileSvc) Detail(_ context.Context, _ domain.AuthUser, _ string, _ bool) (domain.FileRecord, error) {
	if len(f.records) == 0 {
		return domain.FileRecord{}, f.err
	}
	return f.records[0], f.err
}
func (f *fakeFileSvc) Download(_ context.Context, _ domain.AuthUser, _ string, _ bool) (service.DownloadOutcome, error) {
	if f.err != nil {
		return service.DownloadOutcome{}, f.err
	}
	body := io.NopCloser(bytes.NewReader([]byte("file content")))
	return service.DownloadOutcome{
		File:          domain.FileRecord{ID: "f1", Name: "file.txt", MIMEType: "text/plain", SizeBytes: 12},
		Body:          body,
		ContentLength: 12,
	}, nil
}
func (f *fakeFileSvc) SoftDelete(_ context.Context, _ domain.AuthUser, _ string) (time.Time, error) {
	return time.Time{}, f.err
}
func (f *fakeFileSvc) Restore(_ context.Context, _ domain.AuthUser, _ string) (domain.FileRecord, error) {
	return domain.FileRecord{}, f.err
}
func (f *fakeFileSvc) PermanentDelete(_ context.Context, _ domain.AuthUser, _ string) error {
	return f.err
}
func (f *fakeFileSvc) SetStarred(_ context.Context, _ domain.AuthUser, _ string, _ bool) (domain.FileRecord, error) {
	return domain.FileRecord{}, f.err
}
func (f *fakeFileSvc) Search(_ context.Context, _ domain.AuthUser, _, _ string, _ bool, _, _ int) ([]domain.FileRecord, int64, int, int, error) {
	return f.records, 0, 20, 0, f.err
}
func (f *fakeFileSvc) GetManifestInfo(_ context.Context, _ string) (vaultclient.ManifestRecord, error) {
	return vaultclient.ManifestRecord{}, f.err
}
func (f *fakeFileSvc) Trash(_ context.Context, _ domain.AuthUser) ([]domain.FileRecord, error) {
	return f.records, f.err
}
func (f *fakeFileSvc) Starred(_ context.Context, _ domain.AuthUser) ([]domain.FileRecord, error) {
	return f.records, f.err
}

type fakeAuthSvc struct {
	loginResult domain.LoginResult
	loginErr    error
	registerErr error
	user        domain.AuthUser
}

func (f *fakeAuthSvc) Login(_ context.Context, _, _ string) (domain.LoginResult, error) {
	return f.loginResult, f.loginErr
}
func (f *fakeAuthSvc) Register(_ context.Context, _, _, _, _ string) (domain.AuthUser, error) {
	return f.user, f.registerErr
}
func (f *fakeAuthSvc) RequestPasswordReset(_ context.Context, _ string) error       { return nil }
func (f *fakeAuthSvc) ConfirmPasswordReset(_ context.Context, _, _, _ string) error { return nil }
func (f *fakeAuthSvc) AuthenticateToken(_ context.Context, _ string) (domain.AuthUser, error) {
	return f.user, nil
}
func (f *fakeAuthSvc) Logout(_ context.Context, _ domain.AuthUser) error { return nil }
func (f *fakeAuthSvc) UpdateProfile(_ context.Context, _ domain.AuthUser, _, _, _, _ string) (domain.AuthUser, error) {
	return f.user, nil
}

func newAPIWithFakes(dirSvc directoryServiceInterface, fileSvc fileServiceInterface, authSvc authServiceInterface) *API {
	return &API{
		authService:      authSvc,
		directoryService: dirSvc,
		fileService:      fileSvc,
		validator:        validator.New(validator.WithRequiredStructEnabled()),
	}
}

func injectUser(c *gin.Context) {
	c.Set("auth_user", domain.AuthUser{UserID: "uid", Role: "user"})
}

// ---- directory handler tests with service ----

func TestHandleDirectoryTreeSuccess(t *testing.T) {
	t.Parallel()

	records := []domain.DirectoryRecord{{ID: "d1", Name: "Folder A"}}
	api := newAPIWithFakes(&fakeDirSvc{records: records}, &fakeFileSvc{}, &fakeAuthSvc{})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/directories/tree", nil)
	injectUser(c)

	api.handleDirectoryTree(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

func TestHandleCreateDirectorySuccess(t *testing.T) {
	t.Parallel()

	api := newAPIWithFakes(&fakeDirSvc{}, &fakeFileSvc{}, &fakeAuthSvc{})

	body, _ := json.Marshal(map[string]string{"name": "New Folder"})
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/directories", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	injectUser(c)

	api.handleCreateDirectory(c)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
}

func TestHandleCreateDirectoryBadJSON(t *testing.T) {
	t.Parallel()

	api := newAPIWithFakes(&fakeDirSvc{}, &fakeFileSvc{}, &fakeAuthSvc{})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/directories", bytes.NewBufferString("{bad}"))
	c.Request.Header.Set("Content-Type", "application/json")
	injectUser(c)

	api.handleCreateDirectory(c)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

func TestHandleCreateDirectoryServiceError(t *testing.T) {
	t.Parallel()

	api := newAPIWithFakes(&fakeDirSvc{err: domain.ErrConflict}, &fakeFileSvc{}, &fakeAuthSvc{})

	body, _ := json.Marshal(map[string]string{"name": "Conflict Folder"})
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/directories", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	injectUser(c)

	api.handleCreateDirectory(c)

	if w.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d", w.Code)
	}
}

func TestHandleSoftDeleteDirectorySuccess(t *testing.T) {
	t.Parallel()

	api := newAPIWithFakes(&fakeDirSvc{record: domain.DirectoryRecord{ID: "d1"}}, &fakeFileSvc{}, &fakeAuthSvc{})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodDelete, "/directories/d1", nil)
	c.Params = gin.Params{{Key: "id", Value: "d1"}}
	injectUser(c)

	api.handleSoftDeleteDirectory(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

func TestHandleRestoreDirectorySuccess(t *testing.T) {
	t.Parallel()

	api := newAPIWithFakes(&fakeDirSvc{record: domain.DirectoryRecord{ID: "d1"}}, &fakeFileSvc{}, &fakeAuthSvc{})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/directories/d1/restore", nil)
	c.Params = gin.Params{{Key: "id", Value: "d1"}}
	injectUser(c)

	api.handleRestoreDirectory(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

func TestHandlePermanentDeleteDirectorySuccess(t *testing.T) {
	t.Parallel()

	api := newAPIWithFakes(&fakeDirSvc{}, &fakeFileSvc{}, &fakeAuthSvc{})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodDelete, "/directories/d1/permanent", nil)
	c.Params = gin.Params{{Key: "id", Value: "d1"}}
	injectUser(c)

	api.handlePermanentDeleteDirectory(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

func TestHandleStarUnstarDirectorySuccess(t *testing.T) {
	t.Parallel()

	api := newAPIWithFakes(&fakeDirSvc{record: domain.DirectoryRecord{ID: "d1"}}, &fakeFileSvc{}, &fakeAuthSvc{})

	for _, handler := range []func(*gin.Context){api.handleStarDirectory, api.handleUnstarDirectory} {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(http.MethodPut, "/directories/d1/star", nil)
		c.Params = gin.Params{{Key: "id", Value: "d1"}}
		injectUser(c)
		handler(c)
		if w.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", w.Code)
		}
	}
}

func TestHandleTrashSuccess(t *testing.T) {
	t.Parallel()

	api := newAPIWithFakes(
		&fakeDirSvc{records: []domain.DirectoryRecord{{ID: "d1"}}},
		&fakeFileSvc{records: []domain.FileRecord{{ID: "f1"}}},
		&fakeAuthSvc{},
	)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/trash", nil)
	injectUser(c)

	api.handleTrash(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

func TestHandleStarredSuccess(t *testing.T) {
	t.Parallel()

	api := newAPIWithFakes(
		&fakeDirSvc{records: []domain.DirectoryRecord{}},
		&fakeFileSvc{records: []domain.FileRecord{}},
		&fakeAuthSvc{},
	)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/starred", nil)
	injectUser(c)

	api.handleStarred(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

// ---- auth handler tests with fake auth service ----

func TestHandleLoginSuccess(t *testing.T) {
	t.Parallel()

	authSvc := &fakeAuthSvc{
		loginResult: domain.LoginResult{
			AccessToken: "tok",
			ExpiresAt:   time.Now().UTC().Add(time.Hour),
			User:        domain.AuthUser{UserID: "uid"},
		},
	}
	api := newAPIWithFakes(&fakeDirSvc{}, &fakeFileSvc{}, authSvc)

	body, _ := json.Marshal(map[string]string{"email": "a@b.com", "password": "pass"})
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/auth/login", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	api.handleLogin(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestHandleLoginServiceError(t *testing.T) {
	t.Parallel()

	authSvc := &fakeAuthSvc{loginErr: domain.ErrUnauthorized}
	api := newAPIWithFakes(&fakeDirSvc{}, &fakeFileSvc{}, authSvc)

	body, _ := json.Marshal(map[string]string{"email": "a@b.com", "password": "wrong"})
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/auth/login", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	api.handleLogin(c)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestHandleRegisterSuccess(t *testing.T) {
	t.Parallel()

	authSvc := &fakeAuthSvc{user: domain.AuthUser{UserID: "uid", Role: "user"}}
	api := newAPIWithFakes(&fakeDirSvc{}, &fakeFileSvc{}, authSvc)

	body, _ := json.Marshal(map[string]string{
		"full_name": "Alice", "email": "a@b.com",
		"password": "password1", "confirm_password": "password1",
	})
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/auth/register", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	api.handleRegister(c)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
}

func TestHandleLogoutSuccess(t *testing.T) {
	t.Parallel()

	api := newAPIWithFakes(&fakeDirSvc{}, &fakeFileSvc{}, &fakeAuthSvc{})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/auth/logout", nil)
	injectUser(c)

	api.handleLogout(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

// ---- fake admin/insight/activity services ----

type fakeAdminSvc struct{ err error }

func (f *fakeAdminSvc) Analytics(_ context.Context, _ domain.AuthUser, _ string) (domain.AdminAnalytics, error) {
	return domain.AdminAnalytics{}, f.err
}

type fakeInsightSvc struct{ err error }

func (f *fakeInsightSvc) UserInsight(_ context.Context, _ domain.AuthUser, _ string) (domain.UserInsight, error) {
	return domain.UserInsight{}, f.err
}

type fakeActivitySvc struct{ err error }

func (f *fakeActivitySvc) List(_ context.Context, _ domain.AuthUser, _, _ string, _, _ int) ([]domain.ActivityLogRecord, int64, int, int, error) {
	return nil, 0, 20, 0, f.err
}

func newFullAPI(dirSvc directoryServiceInterface, fileSvc fileServiceInterface, authSvc authServiceInterface, adminSvc adminServiceInterface, insightSvc insightServiceInterface, actSvc activityServiceInterface) *API {
	return &API{
		authService:      authSvc,
		directoryService: dirSvc,
		fileService:      fileSvc,
		adminService:     adminSvc,
		insightService:   insightSvc,
		activityService:  actSvc,
		validator:        validator.New(validator.WithRequiredStructEnabled()),
	}
}

// ---- admin handler tests ----

func TestHandleAdminAnalyticsSuccess(t *testing.T) {
	t.Parallel()

	api := newFullAPI(&fakeDirSvc{}, &fakeFileSvc{}, &fakeAuthSvc{}, &fakeAdminSvc{}, &fakeInsightSvc{}, &fakeActivitySvc{})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/admin/analytics", nil)
	injectUser(c)

	api.handleAdminAnalytics(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

func TestHandleAdminAnalyticsError(t *testing.T) {
	t.Parallel()

	api := newFullAPI(&fakeDirSvc{}, &fakeFileSvc{}, &fakeAuthSvc{}, &fakeAdminSvc{err: domain.ErrForbidden}, &fakeInsightSvc{}, &fakeActivitySvc{})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/admin/analytics", nil)
	injectUser(c)

	api.handleAdminAnalytics(c)

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", w.Code)
	}
}

// ---- insight handler tests ----

func TestHandleUserInsightSuccess(t *testing.T) {
	t.Parallel()

	api := newFullAPI(&fakeDirSvc{}, &fakeFileSvc{}, &fakeAuthSvc{}, &fakeAdminSvc{}, &fakeInsightSvc{}, &fakeActivitySvc{})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/insight", nil)
	injectUser(c)

	api.handleUserInsight(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

// ---- activity handler tests ----

func TestHandleActivityLogsSuccess(t *testing.T) {
	t.Parallel()

	api := newFullAPI(&fakeDirSvc{}, &fakeFileSvc{}, &fakeAuthSvc{}, &fakeAdminSvc{}, &fakeInsightSvc{}, &fakeActivitySvc{})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/activity-logs", nil)
	injectUser(c)

	api.handleActivityLogs(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

func TestHandleActivityLogsInvalidLimit(t *testing.T) {
	t.Parallel()

	api := newFullAPI(&fakeDirSvc{}, &fakeFileSvc{}, &fakeAuthSvc{}, &fakeAdminSvc{}, &fakeInsightSvc{}, &fakeActivitySvc{})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/activity-logs?limit=notanumber", nil)
	injectUser(c)

	api.handleActivityLogs(c)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

func TestHandleActivityLogsUnauthenticated(t *testing.T) {
	t.Parallel()

	api := newFullAPI(&fakeDirSvc{}, &fakeFileSvc{}, &fakeAuthSvc{}, &fakeAdminSvc{}, &fakeInsightSvc{}, &fakeActivitySvc{})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/activity-logs", nil)

	api.handleActivityLogs(c)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestHandleUserInsightUnauthenticated(t *testing.T) {
	t.Parallel()

	api := newFullAPI(&fakeDirSvc{}, &fakeFileSvc{}, &fakeAuthSvc{}, &fakeAdminSvc{}, &fakeInsightSvc{}, &fakeActivitySvc{})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/insight", nil)

	api.handleUserInsight(c)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestHandleAdminAnalyticsUnauthenticated(t *testing.T) {
	t.Parallel()

	api := newFullAPI(&fakeDirSvc{}, &fakeFileSvc{}, &fakeAuthSvc{}, &fakeAdminSvc{}, &fakeInsightSvc{}, &fakeActivitySvc{})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/admin/analytics", nil)

	api.handleAdminAnalytics(c)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestHandleStarredServiceError(t *testing.T) {
	t.Parallel()

	api := newAPIWithFakes(
		&fakeDirSvc{},
		&fakeFileSvc{err: domain.ErrUnauthorized},
		&fakeAuthSvc{},
	)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/starred", nil)
	injectUser(c)

	api.handleStarred(c)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestHandleActivityLogsOffsetError(t *testing.T) {
	t.Parallel()

	api := newFullAPI(&fakeDirSvc{}, &fakeFileSvc{}, &fakeAuthSvc{}, &fakeAdminSvc{}, &fakeInsightSvc{}, &fakeActivitySvc{})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/activity-logs?offset=bad", nil)
	injectUser(c)

	api.handleActivityLogs(c)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}
