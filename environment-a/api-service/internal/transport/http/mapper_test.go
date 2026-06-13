package httptransport

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"github.com/alfiang/pui/environment-a/api-service/internal/vaultclient"
	"github.com/gin-gonic/gin"
)

// ---- mapper tests ----

func TestToUserDTO(t *testing.T) {
	t.Parallel()
	user := domain.AuthUser{UserID: "uid", FullName: "Alice", Email: "a@b.com", Role: "user"}
	d := toUserDTO(user)
	if d.ID != user.UserID || d.FullName != user.FullName || d.Email != user.Email || d.Role != user.Role {
		t.Fatalf("toUserDTO mismatch: %+v", d)
	}
}

func TestToDirectoryDTO(t *testing.T) {
	t.Parallel()
	now := time.Now()
	parentID := "pid"
	rec := domain.DirectoryRecord{ID: "d1", Name: "Folder", Depth: 1, ParentID: &parentID, CreatedAt: now}
	d := toDirectoryDTO(rec)
	if d.ID != rec.ID || d.Name != rec.Name || d.Depth != rec.Depth {
		t.Fatalf("toDirectoryDTO mismatch: %+v", d)
	}
}

func TestToDirectoryDTOs(t *testing.T) {
	t.Parallel()
	records := []domain.DirectoryRecord{{ID: "d1"}, {ID: "d2"}}
	dtos := toDirectoryDTOs(records)
	if len(dtos) != 2 {
		t.Fatalf("expected 2 dtos, got %d", len(dtos))
	}
}

func TestToFileDTO(t *testing.T) {
	t.Parallel()
	now := time.Now()
	rec := domain.FileRecord{
		ID: "f1", Name: "file.txt", SizeBytes: 100,
		MIMEType: "text/plain", ManifestID: "mid", StorageStatus: "committed",
		ChunkCount: 2, NewChunks: 1, ReuseChunks: 1, DedupRatio: 0.5, CreatedAt: now,
	}
	d := toFileDTO(rec)
	if d.ID != rec.ID || d.SizeBytes != rec.SizeBytes || d.DedupRatio != rec.DedupRatio {
		t.Fatalf("toFileDTO mismatch: %+v", d)
	}
}

func TestToFileDTOs(t *testing.T) {
	t.Parallel()
	records := []domain.FileRecord{{ID: "f1"}, {ID: "f2"}, {ID: "f3"}}
	dtos := toFileDTOs(records)
	if len(dtos) != 3 {
		t.Fatalf("expected 3 dtos, got %d", len(dtos))
	}
}

func TestToUploadCommitResultDTO(t *testing.T) {
	t.Parallel()
	result := vaultclient.UploadCommitResult{
		ManifestID: "mid", FileHash: "fh", TotalSizeBytes: 1024,
		ChunkCount: 3, NewChunkCount: 2, ReuseChunkCount: 1, DedupRatio: 0.33, Immutable: true,
	}
	d := toUploadCommitResultDTO(result)
	if d.ManifestID != result.ManifestID || d.ChunkCount != result.ChunkCount {
		t.Fatalf("toUploadCommitResultDTO mismatch: %+v", d)
	}
}

func TestToActivityLogDTOs(t *testing.T) {
	t.Parallel()
	now := time.Now()
	resourceID := "rid"
	records := []domain.ActivityLogRecord{
		{ID: "a1", UserID: "uid", Action: "LOGIN", ResourceType: "SESSION", ResourceID: &resourceID, CreatedAt: now},
	}
	dtos := toActivityLogDTOs(records)
	if len(dtos) != 1 || dtos[0].ID != "a1" {
		t.Fatalf("toActivityLogDTOs mismatch: %+v", dtos)
	}
}

func TestToLoginResponse(t *testing.T) {
	t.Parallel()
	result := domain.LoginResult{
		AccessToken: "tok",
		ExpiresAt:   time.Now().UTC(),
		User:        domain.AuthUser{UserID: "uid"},
	}
	resp := toLoginResponse(result)
	if resp.AccessToken != "tok" || resp.Status != "ok" {
		t.Fatalf("toLoginResponse mismatch: %+v", resp)
	}
}

// ---- parseIntQuery ----

func TestParseIntQuery(t *testing.T) {
	t.Parallel()

	cases := []struct {
		raw      string
		fallback int
		want     int
		wantErr  bool
	}{
		{"", 20, 20, false},
		{"10", 20, 10, false},
		{"  5  ", 20, 5, false},
		{"abc", 0, 0, true},
	}
	for _, tc := range cases {
		got, err := parseIntQuery(tc.raw, tc.fallback)
		if tc.wantErr && err == nil {
			t.Errorf("parseIntQuery(%q) expected error", tc.raw)
		}
		if !tc.wantErr && (err != nil || got != tc.want) {
			t.Errorf("parseIntQuery(%q) = (%d,%v), want (%d,nil)", tc.raw, got, err, tc.want)
		}
	}
}

// ---- directory handler 401 tests ----

func TestHandleDirectoryHandlersRejectUnauthenticated(t *testing.T) {
	t.Parallel()

	api := newTestAPI()
	handlers := []struct {
		name    string
		handler func(*gin.Context)
	}{
		{"CreateDirectory", api.handleCreateDirectory},
		{"DirectoryTree", api.handleDirectoryTree},
		{"DirectoryBreadcrumb", api.handleDirectoryBreadcrumb},
		{"SoftDeleteDirectory", api.handleSoftDeleteDirectory},
		{"RestoreDirectory", api.handleRestoreDirectory},
		{"PermanentDeleteDirectory", api.handlePermanentDeleteDirectory},
		{"StarDirectory", api.handleStarDirectory},
		{"UnstarDirectory", api.handleUnstarDirectory},
		{"TrashDirectory", api.handleTrash},
		{"StarredDirectory", api.handleStarred},
	}

	for _, tc := range handlers {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest(http.MethodGet, "/", nil)
			tc.handler(c)
			if w.Code != http.StatusUnauthorized {
				t.Fatalf("%s: expected 401, got %d", tc.name, w.Code)
			}
		})
	}
}

// ---- handleMe with authenticated user ----

func TestHandleMeWithAuthUser(t *testing.T) {
	t.Parallel()

	api := newTestAPI()
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/auth/me", nil)

	// Inject auth user
	c.Set("auth_user", domain.AuthUser{UserID: "uid", FullName: "Alice", Email: "a@b.com", Role: "user"})

	api.handleMe(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

// ---- handlePasswordResetRequest bad JSON ----

func TestHandlePasswordResetRequestRejectsMalformedJSON(t *testing.T) {
	t.Parallel()

	api := newTestAPI()
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/auth/password-reset/request", nil)
	c.Request.Header.Set("Content-Type", "application/json")

	api.handlePasswordResetRequest(c)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

// ---- handlePasswordResetConfirm bad JSON ----

func TestHandlePasswordResetConfirmRejectsMalformedJSON(t *testing.T) {
	t.Parallel()

	api := newTestAPI()
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/auth/password-reset/confirm", nil)
	c.Request.Header.Set("Content-Type", "application/json")

	api.handlePasswordResetConfirm(c)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

// ---- star/unstar file ----

func TestHandleStarUnstarFileRejectUnauthenticated(t *testing.T) {
	t.Parallel()

	api := newTestAPI()
	for _, handler := range []func(*gin.Context){api.handleStarFile, api.handleUnstarFile} {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(http.MethodPut, "/files/id/star", nil)
		c.Params = gin.Params{{Key: "id", Value: "some-id"}}
		handler(c)
		if w.Code != http.StatusUnauthorized {
			t.Fatalf("expected 401, got %d", w.Code)
		}
	}
}
