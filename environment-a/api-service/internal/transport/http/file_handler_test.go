package httptransport

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestHandleListFilesRejectsUnauthenticated(t *testing.T) {
	t.Parallel()

	api := newTestAPI()
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/files", nil)

	api.handleListFiles(c)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestHandleFileDetailRejectsUnauthenticated(t *testing.T) {
	t.Parallel()

	api := newTestAPI()
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/files/some-id", nil)
	c.Params = gin.Params{{Key: "id", Value: "some-id"}}

	api.handleFileDetail(c)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestHandleDownloadFileRejectsUnauthenticated(t *testing.T) {
	t.Parallel()

	api := newTestAPI()
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/files/some-id/download", nil)
	c.Params = gin.Params{{Key: "id", Value: "some-id"}}

	api.handleDownloadFile(c)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestHandleSoftDeleteFileRejectsUnauthenticated(t *testing.T) {
	t.Parallel()

	api := newTestAPI()
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodDelete, "/files/some-id", nil)
	c.Params = gin.Params{{Key: "id", Value: "some-id"}}

	api.handleSoftDeleteFile(c)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestHandleRestoreFileRejectsUnauthenticated(t *testing.T) {
	t.Parallel()

	api := newTestAPI()
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/files/some-id/restore", nil)
	c.Params = gin.Params{{Key: "id", Value: "some-id"}}

	api.handleRestoreFile(c)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestHandlePermanentDeleteFileRejectsUnauthenticated(t *testing.T) {
	t.Parallel()

	api := newTestAPI()
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodDelete, "/files/some-id/permanent", nil)
	c.Params = gin.Params{{Key: "id", Value: "some-id"}}

	api.handlePermanentDeleteFile(c)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestHandleUploadFileRejectsUnauthenticated(t *testing.T) {
	t.Parallel()

	api := newTestAPI()
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/files", nil)

	api.handleUploadFile(c)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestHandleSearchFilesRejectsUnauthenticated(t *testing.T) {
	t.Parallel()

	api := newTestAPI()
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/files/search?q=test", nil)

	api.handleSearchFiles(c)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}
