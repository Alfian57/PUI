package service

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"github.com/alfiang/pui/environment-a/api-service/internal/vaultclient"
)

// Re-uses fakeFileRepo, fakeDirectoryRepo, fakeActivityLogger, fakeVaultClient
// already defined in file_service_test.go.

var (
	fileUser  = domain.AuthUser{UserID: testUserID, Role: "user"}
	committed = domain.FileRecord{
		ID:            testFileID,
		Name:          "file.txt",
		SizeBytes:     10,
		MIMEType:      "text/plain",
		ManifestID:    strings.Repeat("a", 64),
		StorageStatus: "committed",
		CreatedAt:     time.Now().UTC(),
	}
)

func newFileSvcWith(files *fakeFileRepo, vault *fakeVaultClient) *FileService {
	return NewFileService(files, fakeDirectoryRepo{}, &fakeActivityLogger{}, vault)
}

// ---- ListByDirectory ----

func TestFileServiceListByDirectory(t *testing.T) {
	t.Parallel()
	files := newFakeFileRepo()
	files.records[testFileID] = committed
	svc := newFileSvcWith(files, &fakeVaultClient{})

	list, err := svc.ListByDirectory(context.Background(), fileUser, "", false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(list) != 1 {
		t.Fatalf("expected 1 file, got %d", len(list))
	}
}

// ---- PermanentDelete ----

func TestFileServicePermanentDeleteRejectsInvalidID(t *testing.T) {
	t.Parallel()
	svc := newFileSvcWith(newFakeFileRepo(), &fakeVaultClient{})
	if err := svc.PermanentDelete(context.Background(), fileUser, "bad-id"); !errors.Is(err, domain.ErrInvalidInput) {
		t.Fatalf("want ErrInvalidInput, got %v", err)
	}
}

func TestFileServicePermanentDeleteSuccess(t *testing.T) {
	t.Parallel()
	files := newFakeFileRepo()
	deletedAt := time.Now().UTC()
	rec := committed
	rec.DeletedAt = &deletedAt
	files.records[testFileID] = rec

	if err := newFileSvcWith(files, &fakeVaultClient{}).PermanentDelete(context.Background(), fileUser, testFileID); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

// ---- SetStarred ----

func TestFileServiceSetStarredRejectsInvalidID(t *testing.T) {
	t.Parallel()
	svc := newFileSvcWith(newFakeFileRepo(), &fakeVaultClient{})
	if _, err := svc.SetStarred(context.Background(), fileUser, "bad-id", true); !errors.Is(err, domain.ErrInvalidInput) {
		t.Fatalf("want ErrInvalidInput, got %v", err)
	}
}

func TestFileServiceSetStarredSuccess(t *testing.T) {
	t.Parallel()
	files := newFakeFileRepo()
	files.records[testFileID] = committed

	for _, starred := range []bool{true, false} {
		if _, err := newFileSvcWith(files, &fakeVaultClient{}).SetStarred(context.Background(), fileUser, testFileID, starred); err != nil {
			t.Fatalf("SetStarred(%v) unexpected error: %v", starred, err)
		}
	}
}

// ---- Search ----

func TestFileServiceSearchValidation(t *testing.T) {
	t.Parallel()
	svc := newFileSvcWith(newFakeFileRepo(), &fakeVaultClient{})

	cases := []struct {
		query       string
		limit       int
		offset      int
		desc        string
	}{
		{"", 0, 0, "empty query"},
		{"a", 0, 0, "query too short"},
		{strings.Repeat("x", 256), 0, 0, "query too long"},
		{"test", 201, 0, "limit too high"},
		{"test", 1, -1, "negative offset"},
	}
	for _, tc := range cases {
		if _, _, _, _, err := svc.Search(context.Background(), fileUser, tc.query, "", false, tc.limit, tc.offset); !errors.Is(err, domain.ErrInvalidInput) {
			t.Errorf("[%s] want ErrInvalidInput, got %v", tc.desc, err)
		}
	}
}

func TestFileServiceSearchSuccess(t *testing.T) {
	t.Parallel()
	files := newFakeFileRepo()
	svc := newFileSvcWith(files, &fakeVaultClient{})

	results, total, limit, offset, err := svc.Search(context.Background(), fileUser, "backup", "", false, 0, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	_ = results
	_ = total
	if limit != defaultFileSearchLimit {
		t.Fatalf("expected default limit %d, got %d", defaultFileSearchLimit, limit)
	}
	if offset != 0 {
		t.Fatalf("expected offset 0, got %d", offset)
	}
}

// ---- GetManifestInfo ----

func TestFileServiceGetManifestInfo(t *testing.T) {
	t.Parallel()
	manifestID := strings.Repeat("a", 64)
	vault := &fakeVaultClient{
		manifests: map[string]vaultclient.ManifestRecord{
			manifestID: {ManifestID: manifestID, FileHash: strings.Repeat("b", 64), ChunkCount: 1},
		},
	}
	svc := newFileSvcWith(newFakeFileRepo(), vault)

	manifest, err := svc.GetManifestInfo(context.Background(), manifestID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if manifest.ManifestID != manifestID {
		t.Fatalf("manifest id mismatch")
	}
}

// ---- Trash / Starred ----

func TestFileServiceTrashAndStarred(t *testing.T) {
	t.Parallel()
	svc := newFileSvcWith(newFakeFileRepo(), &fakeVaultClient{})

	if _, err := svc.Trash(context.Background(), fileUser); err != nil {
		t.Fatalf("Trash unexpected error: %v", err)
	}
	if _, err := svc.Starred(context.Background(), fileUser); err != nil {
		t.Fatalf("Starred unexpected error: %v", err)
	}
}
