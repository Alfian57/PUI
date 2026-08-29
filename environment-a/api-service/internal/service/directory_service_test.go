package service

import (
	"context"
	"errors"
	"testing"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
)

// ---- fake directoryRepository ----

type fakeDirRepo struct {
	record    domain.DirectoryRecord
	records   []domain.DirectoryRecord
	createErr error
	treeErr   error
	crumbErr  error
	ownedErr  error
	owned     bool
	softErr   error
	restErr   error
	permErr   error
	starErr   error
}

func (f *fakeDirRepo) Create(_ context.Context, _, name, _ string) (domain.DirectoryRecord, error) {
	if f.createErr != nil {
		return domain.DirectoryRecord{}, f.createErr
	}
	return domain.DirectoryRecord{ID: "dir-1", Name: name}, nil
}
func (f *fakeDirRepo) Tree(_ context.Context, _, _ string) ([]domain.DirectoryRecord, error) {
	return f.records, f.treeErr
}
func (f *fakeDirRepo) Breadcrumb(_ context.Context, _, _ string) ([]domain.DirectoryRecord, error) {
	return f.records, f.crumbErr
}
func (f *fakeDirRepo) IsOwnedByUser(_ context.Context, _, _ string) (bool, error) {
	return f.owned, f.ownedErr
}
func (f *fakeDirRepo) SoftDeleteSubtree(_ context.Context, _, _ string) (domain.DirectoryRecord, error) {
	return f.record, f.softErr
}
func (f *fakeDirRepo) RestoreSubtree(_ context.Context, _, _ string) (domain.DirectoryRecord, error) {
	return f.record, f.restErr
}
func (f *fakeDirRepo) PermanentDeleteSubtree(_ context.Context, _, _ string) error {
	return f.permErr
}
func (f *fakeDirRepo) SetStarred(_ context.Context, _, _ string, _ bool) (domain.DirectoryRecord, error) {
	return f.record, f.starErr
}
func (f *fakeDirRepo) ListTrashRoots(_ context.Context, _ string) ([]domain.DirectoryRecord, error) {
	return f.records, nil
}
func (f *fakeDirRepo) ListStarred(_ context.Context, _ string) ([]domain.DirectoryRecord, error) {
	return f.records, nil
}
func (f *fakeDirRepo) ListTrashRootsPage(_ context.Context, _ string, limit, offset int) ([]domain.DirectoryRecord, int64, error) {
	return f.records, int64(len(f.records)), nil
}
func (f *fakeDirRepo) ListStarredPage(_ context.Context, _ string, limit, offset int) ([]domain.DirectoryRecord, int64, error) {
	return f.records, int64(len(f.records)), nil
}

func newDirSvc(repo *fakeDirRepo) *DirectoryService {
	return &DirectoryService{directoryRepo: repo, activityRepo: fakeActivity{}}
}

var validDirID = "11111111-1111-1111-8111-111111111111"
var dirUser = domain.AuthUser{UserID: "uid"}

// ---- Create ----

func TestDirectoryServiceCreateValidation(t *testing.T) {
	t.Parallel()
	svc := &DirectoryService{}
	cases := []struct {
		name, parentID string
		desc           string
	}{
		{"", "", "empty name"},
		{string(make([]byte, 256)), "", "name too long"},
		{"valid", "not-a-uuid", "invalid parentID"},
	}
	for _, tc := range cases {
		if _, err := svc.Create(context.Background(), dirUser, tc.name, tc.parentID); !errors.Is(err, domain.ErrInvalidInput) {
			t.Errorf("[%s] want ErrInvalidInput, got %v", tc.desc, err)
		}
	}
}

func TestDirectoryServiceCreateSuccess(t *testing.T) {
	t.Parallel()
	repo := &fakeDirRepo{}
	dir, err := newDirSvc(repo).Create(context.Background(), dirUser, "My Folder", "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if dir.Name != "My Folder" {
		t.Fatalf("unexpected name: %s", dir.Name)
	}
}

func TestDirectoryServiceCreateRepoError(t *testing.T) {
	t.Parallel()
	repoErr := errors.New("db error")
	repo := &fakeDirRepo{createErr: repoErr}
	if _, err := newDirSvc(repo).Create(context.Background(), dirUser, "Folder", ""); !errors.Is(err, repoErr) {
		t.Fatalf("expected repo error, got %v", err)
	}
}

// ---- Tree ----

func TestDirectoryServiceTreeRejectsInvalidRootID(t *testing.T) {
	t.Parallel()
	svc := &DirectoryService{}
	if _, err := svc.Tree(context.Background(), dirUser, "bad-id"); !errors.Is(err, domain.ErrInvalidInput) {
		t.Fatalf("want ErrInvalidInput, got %v", err)
	}
}

func TestDirectoryServiceTreeSuccess(t *testing.T) {
	t.Parallel()
	records := []domain.DirectoryRecord{{ID: "d1"}, {ID: "d2"}}
	repo := &fakeDirRepo{records: records}
	got, err := newDirSvc(repo).Tree(context.Background(), dirUser, "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("expected 2 records, got %d", len(got))
	}
}

// ---- Breadcrumb ----

func TestDirectoryServiceBreadcrumbRejectsInvalidID(t *testing.T) {
	t.Parallel()
	svc := &DirectoryService{}
	if _, err := svc.Breadcrumb(context.Background(), dirUser, "bad-id"); !errors.Is(err, domain.ErrInvalidInput) {
		t.Fatalf("want ErrInvalidInput, got %v", err)
	}
}

func TestDirectoryServiceBreadcrumbSuccess(t *testing.T) {
	t.Parallel()
	repo := &fakeDirRepo{records: []domain.DirectoryRecord{{ID: "d1"}}}
	got, err := newDirSvc(repo).Breadcrumb(context.Background(), dirUser, validDirID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) == 0 {
		t.Fatal("expected non-empty breadcrumb")
	}
}

// ---- SoftDelete ----

func TestDirectoryServiceSoftDeleteRejectsInvalidID(t *testing.T) {
	t.Parallel()
	svc := &DirectoryService{}
	if _, err := svc.SoftDelete(context.Background(), dirUser, "bad-id"); !errors.Is(err, domain.ErrInvalidInput) {
		t.Fatalf("want ErrInvalidInput, got %v", err)
	}
}

func TestDirectoryServiceSoftDeleteSuccess(t *testing.T) {
	t.Parallel()
	repo := &fakeDirRepo{record: domain.DirectoryRecord{ID: validDirID}}
	got, err := newDirSvc(repo).SoftDelete(context.Background(), dirUser, validDirID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != validDirID {
		t.Fatalf("id mismatch")
	}
}

func TestDirectoryServiceSoftDeleteRepoError(t *testing.T) {
	t.Parallel()
	repoErr := errors.New("not found")
	repo := &fakeDirRepo{softErr: repoErr}
	if _, err := newDirSvc(repo).SoftDelete(context.Background(), dirUser, validDirID); !errors.Is(err, repoErr) {
		t.Fatalf("expected repo error, got %v", err)
	}
}

// ---- Restore ----

func TestDirectoryServiceRestoreRejectsInvalidID(t *testing.T) {
	t.Parallel()
	svc := &DirectoryService{}
	if _, err := svc.Restore(context.Background(), dirUser, "bad-id"); !errors.Is(err, domain.ErrInvalidInput) {
		t.Fatalf("want ErrInvalidInput, got %v", err)
	}
}

func TestDirectoryServiceRestoreSuccess(t *testing.T) {
	t.Parallel()
	repo := &fakeDirRepo{record: domain.DirectoryRecord{ID: validDirID}}
	got, err := newDirSvc(repo).Restore(context.Background(), dirUser, validDirID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != validDirID {
		t.Fatalf("id mismatch")
	}
}

// ---- PermanentDelete ----

func TestDirectoryServicePermanentDeleteRejectsInvalidID(t *testing.T) {
	t.Parallel()
	svc := &DirectoryService{}
	if err := svc.PermanentDelete(context.Background(), dirUser, "bad-id"); !errors.Is(err, domain.ErrInvalidInput) {
		t.Fatalf("want ErrInvalidInput, got %v", err)
	}
}

func TestDirectoryServicePermanentDeleteSuccess(t *testing.T) {
	t.Parallel()
	repo := &fakeDirRepo{}
	if err := newDirSvc(repo).PermanentDelete(context.Background(), dirUser, validDirID); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

// ---- SetStarred ----

func TestDirectoryServiceSetStarredRejectsInvalidID(t *testing.T) {
	t.Parallel()
	svc := &DirectoryService{}
	if _, err := svc.SetStarred(context.Background(), dirUser, "bad-id", true); !errors.Is(err, domain.ErrInvalidInput) {
		t.Fatalf("want ErrInvalidInput, got %v", err)
	}
}

func TestDirectoryServiceSetStarredSuccess(t *testing.T) {
	t.Parallel()
	repo := &fakeDirRepo{record: domain.DirectoryRecord{ID: validDirID}}
	for _, starred := range []bool{true, false} {
		if _, err := newDirSvc(repo).SetStarred(context.Background(), dirUser, validDirID, starred); err != nil {
			t.Fatalf("SetStarred(%v) unexpected error: %v", starred, err)
		}
	}
}

// ---- Trash / Starred ----

func TestDirectoryServiceTrashAndStarred(t *testing.T) {
	t.Parallel()
	records := []domain.DirectoryRecord{{ID: "d1"}, {ID: "d2"}}
	repo := &fakeDirRepo{records: records}
	svc := newDirSvc(repo)

	trash, err := svc.Trash(context.Background(), dirUser)
	if err != nil || len(trash) != 2 {
		t.Fatalf("Trash: err=%v len=%d", err, len(trash))
	}

	starred, err := svc.Starred(context.Background(), dirUser)
	if err != nil || len(starred) != 2 {
		t.Fatalf("Starred: err=%v len=%d", err, len(starred))
	}
}

// ---- IsOwnedByUser ----

func TestDirectoryServiceIsOwnedByUserRejectsInvalidID(t *testing.T) {
	t.Parallel()
	svc := &DirectoryService{}
	if _, err := svc.IsOwnedByUser(context.Background(), dirUser, "bad-id"); !errors.Is(err, domain.ErrInvalidInput) {
		t.Fatalf("want ErrInvalidInput, got %v", err)
	}
}

func TestDirectoryServiceIsOwnedByUserSuccess(t *testing.T) {
	t.Parallel()
	repo := &fakeDirRepo{owned: true}
	ok, err := newDirSvc(repo).IsOwnedByUser(context.Background(), dirUser, validDirID)
	if err != nil || !ok {
		t.Fatalf("IsOwnedByUser: err=%v ok=%v", err, ok)
	}
}
