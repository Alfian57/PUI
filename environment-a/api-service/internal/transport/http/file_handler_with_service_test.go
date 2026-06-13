package httptransport

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"github.com/gin-gonic/gin"
)

func TestHandleListFilesSuccess(t *testing.T) {
	t.Parallel()

	api := newAPIWithFakes(
		&fakeDirSvc{},
		&fakeFileSvc{records: []domain.FileRecord{{ID: "f1", Name: "file.txt", StorageStatus: "committed", CreatedAt: time.Now()}}},
		&fakeAuthSvc{},
	)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/files", nil)
	injectUser(c)

	api.handleListFiles(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestHandleFileDetailSuccess(t *testing.T) {
	t.Parallel()

	api := newAPIWithFakes(
		&fakeDirSvc{},
		&fakeFileSvc{records: []domain.FileRecord{{ID: "f1", Name: "file.txt", StorageStatus: "committed", CreatedAt: time.Now()}}},
		&fakeAuthSvc{},
	)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/files/f1", nil)
	c.Params = gin.Params{{Key: "id", Value: "f1"}}
	injectUser(c)

	api.handleFileDetail(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestHandleFileDetailNotFound(t *testing.T) {
	t.Parallel()

	api := newAPIWithFakes(
		&fakeDirSvc{},
		&fakeFileSvc{err: domain.ErrNotFound},
		&fakeAuthSvc{},
	)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/files/f1", nil)
	c.Params = gin.Params{{Key: "id", Value: "f1"}}
	injectUser(c)

	api.handleFileDetail(c)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}

func TestHandleSoftDeleteFileSuccess(t *testing.T) {
	t.Parallel()

	api := newAPIWithFakes(&fakeDirSvc{}, &fakeFileSvc{}, &fakeAuthSvc{})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodDelete, "/files/f1", nil)
	c.Params = gin.Params{{Key: "id", Value: "f1"}}
	injectUser(c)

	api.handleSoftDeleteFile(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

func TestHandleRestoreFileSuccess(t *testing.T) {
	t.Parallel()

	api := newAPIWithFakes(&fakeDirSvc{}, &fakeFileSvc{}, &fakeAuthSvc{})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/files/f1/restore", nil)
	c.Params = gin.Params{{Key: "id", Value: "f1"}}
	injectUser(c)

	api.handleRestoreFile(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

func TestHandlePermanentDeleteFileSuccess(t *testing.T) {
	t.Parallel()

	api := newAPIWithFakes(&fakeDirSvc{}, &fakeFileSvc{}, &fakeAuthSvc{})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodDelete, "/files/f1/permanent", nil)
	c.Params = gin.Params{{Key: "id", Value: "f1"}}
	injectUser(c)

	api.handlePermanentDeleteFile(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

func TestHandleStarUnstarFileSuccess(t *testing.T) {
	t.Parallel()

	api := newAPIWithFakes(&fakeDirSvc{}, &fakeFileSvc{}, &fakeAuthSvc{})

	for _, handler := range []func(*gin.Context){api.handleStarFile, api.handleUnstarFile} {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(http.MethodPut, "/files/f1/star", nil)
		c.Params = gin.Params{{Key: "id", Value: "f1"}}
		injectUser(c)
		handler(c)
		if w.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", w.Code)
		}
	}
}

func TestHandleSearchFilesSuccess(t *testing.T) {
	t.Parallel()

	api := newAPIWithFakes(&fakeDirSvc{}, &fakeFileSvc{}, &fakeAuthSvc{})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/files/search?q=backup", nil)
	injectUser(c)

	api.handleSearchFiles(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestHandleSearchFilesInvalidLimit(t *testing.T) {
	t.Parallel()

	api := newAPIWithFakes(&fakeDirSvc{}, &fakeFileSvc{}, &fakeAuthSvc{})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/files/search?q=backup&limit=notanumber", nil)
	injectUser(c)

	api.handleSearchFiles(c)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

func TestHandleDirectoryFilesSuccess(t *testing.T) {
	t.Parallel()

	api := newAPIWithFakes(
		&fakeDirSvc{},
		&fakeFileSvc{records: []domain.FileRecord{{ID: "f1"}}},
		&fakeAuthSvc{},
	)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/directories/d1/files", nil)
	c.Params = gin.Params{{Key: "id", Value: "d1"}}
	injectUser(c)

	api.handleDirectoryFiles(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

func TestHandleDirectoryBreadcrumbSuccess(t *testing.T) {
	t.Parallel()

	api := newAPIWithFakes(
		&fakeDirSvc{records: []domain.DirectoryRecord{{ID: "d1"}}},
		&fakeFileSvc{},
		&fakeAuthSvc{},
	)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/directories/d1/breadcrumb", nil)
	c.Params = gin.Params{{Key: "id", Value: "d1"}}
	injectUser(c)

	api.handleDirectoryBreadcrumb(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

func TestHandleDownloadFileNotFound(t *testing.T) {
	t.Parallel()

	api := newAPIWithFakes(
		&fakeDirSvc{},
		&fakeFileSvc{err: domain.ErrNotFound},
		&fakeAuthSvc{},
	)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/files/f1/download", nil)
	c.Params = gin.Params{{Key: "id", Value: "f1"}}
	injectUser(c)

	api.handleDownloadFile(c)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}

func TestHandleListFilesServiceError(t *testing.T) {
	t.Parallel()

	api := newAPIWithFakes(&fakeDirSvc{}, &fakeFileSvc{err: domain.ErrNotFound}, &fakeAuthSvc{})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/files", nil)
	injectUser(c)

	api.handleListFiles(c)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}

func TestHandleRestoreFileNotFound(t *testing.T) {
	t.Parallel()

	api := newAPIWithFakes(&fakeDirSvc{}, &fakeFileSvc{err: domain.ErrNotFound}, &fakeAuthSvc{})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/files/f1/restore", nil)
	c.Params = gin.Params{{Key: "id", Value: "f1"}}
	injectUser(c)

	api.handleRestoreFile(c)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}

func TestHandlePermanentDeleteFileNotFound(t *testing.T) {
	t.Parallel()

	api := newAPIWithFakes(&fakeDirSvc{}, &fakeFileSvc{err: domain.ErrNotFound}, &fakeAuthSvc{})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodDelete, "/files/f1/permanent", nil)
	c.Params = gin.Params{{Key: "id", Value: "f1"}}
	injectUser(c)

	api.handlePermanentDeleteFile(c)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}

func TestHandleSearchFilesServiceError(t *testing.T) {
	t.Parallel()

	api := newAPIWithFakes(&fakeDirSvc{}, &fakeFileSvc{err: domain.ErrInvalidInput}, &fakeAuthSvc{})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/files/search?q=backup", nil)
	injectUser(c)

	api.handleSearchFiles(c)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

func TestHandleSoftDeleteFileServiceError(t *testing.T) {
	t.Parallel()

	api := newAPIWithFakes(&fakeDirSvc{}, &fakeFileSvc{err: domain.ErrNotFound}, &fakeAuthSvc{})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodDelete, "/files/f1", nil)
	c.Params = gin.Params{{Key: "id", Value: "f1"}}
	injectUser(c)

	api.handleSoftDeleteFile(c)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}

func TestHandleTrashServiceError(t *testing.T) {
	t.Parallel()

	api := newAPIWithFakes(
		&fakeDirSvc{err: domain.ErrUnauthorized},
		&fakeFileSvc{},
		&fakeAuthSvc{},
	)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/trash", nil)
	injectUser(c)

	api.handleTrash(c)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestHandleUpdateProfileSuccess(t *testing.T) {
	t.Parallel()

	authSvc := &fakeAuthSvc{user: domain.AuthUser{UserID: "uid", Email: "a@b.com", Role: "user"}}
	api := newAPIWithFakes(&fakeDirSvc{}, &fakeFileSvc{}, authSvc)

	body, _ := json.Marshal(map[string]string{
		"full_name": "Alice Updated",
		"email":     "a@b.com",
	})
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPatch, "/auth/me", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	injectUser(c)

	api.handleUpdateProfile(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestHandleDownloadFileSuccess(t *testing.T) {
	t.Parallel()

	api := newAPIWithFakes(
		&fakeDirSvc{},
		&fakeFileSvc{records: []domain.FileRecord{{ID: "f1", Name: "file.txt", MIMEType: "text/plain", SizeBytes: 12}}},
		&fakeAuthSvc{},
	)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/files/f1/download", nil)
	c.Params = gin.Params{{Key: "id", Value: "f1"}}
	injectUser(c)

	api.handleDownloadFile(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}
