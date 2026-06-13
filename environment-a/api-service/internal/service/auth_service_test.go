package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
)

// ---- fakes ----

type fakeAuthRepo struct {
	user              domain.AuthUser
	findErr           error
	emailExists       bool
	emailExistsOther  bool
	emailErr          error
	createUserErr     error
	resetToken        domain.PasswordResetToken
	resetFindErr      error
	resetCompleteErr  error
	sessionID         string
	createSessErr     error
	verifyResult      bool
	verifyErr         error
	updateProfileUser domain.AuthUser
	updateProfileErr  error
}

func (f *fakeAuthRepo) FindUserByCredentials(_ context.Context, _, _ string) (domain.AuthUser, error) {
	return f.user, f.findErr
}
func (f *fakeAuthRepo) CreateSession(_ context.Context, _, _ string, _ time.Time) (string, error) {
	return f.sessionID, f.createSessErr
}
func (f *fakeAuthRepo) EmailExists(_ context.Context, _ string) (bool, error) {
	return f.emailExists, f.emailErr
}
func (f *fakeAuthRepo) CreateUser(_ context.Context, fullName, email, _ string) (domain.AuthUser, error) {
	if f.createUserErr != nil {
		return domain.AuthUser{}, f.createUserErr
	}
	return domain.AuthUser{UserID: "new-id", FullName: fullName, Email: email, Role: "user"}, nil
}
func (f *fakeAuthRepo) FindUserByEmail(_ context.Context, _ string) (domain.AuthUser, bool, error) {
	if f.findErr != nil {
		return domain.AuthUser{}, false, f.findErr
	}
	if f.user.UserID == "" {
		return domain.AuthUser{}, false, nil
	}
	return f.user, true, nil
}
func (f *fakeAuthRepo) CreatePasswordResetToken(_ context.Context, _, _ string, _ time.Time) (string, error) {
	return "reset-id", nil
}
func (f *fakeAuthRepo) FindPasswordResetToken(_ context.Context, _ string) (domain.PasswordResetToken, error) {
	return f.resetToken, f.resetFindErr
}
func (f *fakeAuthRepo) CompletePasswordReset(_ context.Context, _, _, _ string) error {
	return f.resetCompleteErr
}
func (f *fakeAuthRepo) FindSessionUserByTokenHash(_ context.Context, _ string) (domain.AuthUser, error) {
	return f.user, f.findErr
}
func (f *fakeAuthRepo) RevokeSession(_ context.Context, _ string) error { return nil }
func (f *fakeAuthRepo) EmailExistsForOtherUser(_ context.Context, _, _ string) (bool, error) {
	return f.emailExistsOther, f.emailErr
}
func (f *fakeAuthRepo) VerifyUserPassword(_ context.Context, _, _ string) (bool, error) {
	return f.verifyResult, f.verifyErr
}
func (f *fakeAuthRepo) UpdateUserProfile(_ context.Context, _, fullName, email, _ string) (domain.AuthUser, error) {
	if f.updateProfileErr != nil {
		return domain.AuthUser{}, f.updateProfileErr
	}
	u := f.updateProfileUser
	if u.UserID == "" {
		u = domain.AuthUser{UserID: "uid", FullName: fullName, Email: email, Role: "user"}
	}
	return u, nil
}
func (f *fakeAuthRepo) RevokeOtherSessions(_ context.Context, _, _ string) error { return nil }

type fakeActivity struct{}

func (fakeActivity) Log(_ context.Context, _, _, _ string, _ *string) error { return nil }

type fakeMailer struct{ err error }

func (f *fakeMailer) SendPasswordReset(_ context.Context, _, _, _ string) error { return f.err }

func newSvc(repo *fakeAuthRepo) *AuthService {
	return &AuthService{
		authRepo:         repo,
		activityRepo:     fakeActivity{},
		sessionTTLMinute: 60,
		resetTTLMinute:   15,
		publicWebURL:     "http://localhost:5173",
		resetMailer:      &fakeMailer{},
	}
}

// ---- Login ----

func TestAuthServiceLoginRejectsEmptyCredentials(t *testing.T) {
	t.Parallel()
	svc := &AuthService{}
	for _, tc := range []struct{ e, p string }{{"", ""}, {"a@b.com", ""}, {"", "pass"}} {
		if _, err := svc.Login(context.Background(), tc.e, tc.p); !errors.Is(err, domain.ErrInvalidInput) {
			t.Errorf("Login(%q,%q) want ErrInvalidInput, got %v", tc.e, tc.p, err)
		}
	}
}

func TestAuthServiceLoginSuccess(t *testing.T) {
	t.Parallel()
	repo := &fakeAuthRepo{
		user:      domain.AuthUser{UserID: "uid", Email: "a@b.com", Role: "user"},
		sessionID: "sess-1",
	}
	result, err := newSvc(repo).Login(context.Background(), "a@b.com", "password")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.AccessToken == "" {
		t.Fatal("expected non-empty access token")
	}
	if result.User.UserID != "uid" {
		t.Fatalf("user id mismatch")
	}
}

func TestAuthServiceLoginRepoError(t *testing.T) {
	t.Parallel()
	repoErr := errors.New("db error")
	repo := &fakeAuthRepo{findErr: repoErr}
	if _, err := newSvc(repo).Login(context.Background(), "a@b.com", "pass"); !errors.Is(err, repoErr) {
		t.Fatalf("expected repo error, got %v", err)
	}
}

func TestAuthServiceLoginSessionCreateError(t *testing.T) {
	t.Parallel()
	sessErr := errors.New("session create failed")
	repo := &fakeAuthRepo{
		user:          domain.AuthUser{UserID: "uid"},
		createSessErr: sessErr,
	}
	if _, err := newSvc(repo).Login(context.Background(), "a@b.com", "pass"); !errors.Is(err, sessErr) {
		t.Fatalf("expected session error, got %v", err)
	}
}

// ---- Register ----

func TestAuthServiceRegisterValidation(t *testing.T) {
	t.Parallel()
	svc := &AuthService{}
	cases := []struct{ name, email, pass, confirm string }{
		{"", "a@b.com", "password1", "password1"},
		{"Al", "", "password1", "password1"},
		{"Al", "a@b.com", "short", "short"},
		{"Al", "a@b.com", "password1", "different"},
		{"A", "a@b.com", "password1", "password1"},
	}
	for _, tc := range cases {
		if _, err := svc.Register(context.Background(), tc.name, tc.email, tc.pass, tc.confirm); !errors.Is(err, domain.ErrInvalidInput) {
			t.Errorf("Register(%q,%q) want ErrInvalidInput, got %v", tc.name, tc.email, err)
		}
	}
}

func TestAuthServiceRegisterEmailConflict(t *testing.T) {
	t.Parallel()
	repo := &fakeAuthRepo{emailExists: true}
	if _, err := newSvc(repo).Register(context.Background(), "Alice", "a@b.com", "password1", "password1"); !errors.Is(err, domain.ErrConflict) {
		t.Fatalf("expected ErrConflict, got %v", err)
	}
}

func TestAuthServiceRegisterSuccess(t *testing.T) {
	t.Parallel()
	repo := &fakeAuthRepo{}
	user, err := newSvc(repo).Register(context.Background(), "Alice", "a@b.com", "password1", "password1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if user.UserID == "" {
		t.Fatal("expected non-empty user id")
	}
}

// ---- AuthenticateToken ----

func TestAuthServiceAuthenticateTokenRejectsEmpty(t *testing.T) {
	t.Parallel()
	svc := &AuthService{}
	for _, tok := range []string{"", "   "} {
		if _, err := svc.AuthenticateToken(context.Background(), tok); !errors.Is(err, domain.ErrUnauthorized) {
			t.Errorf("AuthenticateToken(%q) want ErrUnauthorized, got %v", tok, err)
		}
	}
}

func TestAuthServiceAuthenticateTokenSuccess(t *testing.T) {
	t.Parallel()
	expected := domain.AuthUser{UserID: "uid", Role: "user"}
	repo := &fakeAuthRepo{user: expected}
	user, err := newSvc(repo).AuthenticateToken(context.Background(), "valid-token")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if user.UserID != expected.UserID {
		t.Fatalf("user id mismatch")
	}
}

// ---- Logout ----

func TestAuthServiceLogoutSuccess(t *testing.T) {
	t.Parallel()
	repo := &fakeAuthRepo{}
	user := domain.AuthUser{UserID: "uid", SessionID: "sess-1"}
	if err := newSvc(repo).Logout(context.Background(), user); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

// ---- RequestPasswordReset ----

func TestAuthServiceRequestPasswordResetRejectsEmptyEmail(t *testing.T) {
	t.Parallel()
	svc := &AuthService{}
	if err := svc.RequestPasswordReset(context.Background(), ""); !errors.Is(err, domain.ErrInvalidInput) {
		t.Fatalf("want ErrInvalidInput, got %v", err)
	}
}

func TestAuthServiceRequestPasswordResetUserNotFound(t *testing.T) {
	t.Parallel()
	// user not found → silent return (no error, no email sent)
	repo := &fakeAuthRepo{user: domain.AuthUser{}}
	if err := newSvc(repo).RequestPasswordReset(context.Background(), "notfound@b.com"); err != nil {
		t.Fatalf("expected nil for unknown email, got %v", err)
	}
}

func TestAuthServiceRequestPasswordResetMailerError(t *testing.T) {
	t.Parallel()
	mailerErr := errors.New("smtp failure")
	svc := &AuthService{
		authRepo:       &fakeAuthRepo{user: domain.AuthUser{UserID: "uid", Email: "a@b.com", FullName: "Alice"}},
		activityRepo:   fakeActivity{},
		resetTTLMinute: 15,
		publicWebURL:   "http://localhost:5173",
		resetMailer:    &fakeMailer{err: mailerErr},
	}
	if err := svc.RequestPasswordReset(context.Background(), "a@b.com"); !errors.Is(err, mailerErr) {
		t.Fatalf("expected mailer error, got %v", err)
	}
}

func TestAuthServiceRequestPasswordResetMissingMailer(t *testing.T) {
	t.Parallel()
	svc := &AuthService{
		authRepo:       &fakeAuthRepo{user: domain.AuthUser{UserID: "uid", Email: "a@b.com"}},
		activityRepo:   fakeActivity{},
		resetTTLMinute: 15,
		publicWebURL:   "http://localhost:5173",
		resetMailer:    nil,
	}
	if err := svc.RequestPasswordReset(context.Background(), "a@b.com"); err == nil {
		t.Fatal("expected error when mailer is nil")
	}
}

func TestAuthServiceRequestPasswordResetMissingWebURL(t *testing.T) {
	t.Parallel()
	svc := &AuthService{
		authRepo:       &fakeAuthRepo{user: domain.AuthUser{UserID: "uid", Email: "a@b.com"}},
		activityRepo:   fakeActivity{},
		resetTTLMinute: 15,
		publicWebURL:   "",
		resetMailer:    &fakeMailer{},
	}
	if err := svc.RequestPasswordReset(context.Background(), "a@b.com"); err == nil {
		t.Fatal("expected error when publicWebURL is empty")
	}
}

// ---- ConfirmPasswordReset ----

func TestAuthServiceConfirmPasswordResetValidation(t *testing.T) {
	t.Parallel()
	svc := &AuthService{}
	cases := []struct{ token, pass, confirm string }{
		{"", "newpass1", "newpass1"},
		{"tok", "short", "short"},
		{"tok", "newpass1", "different"},
	}
	for _, tc := range cases {
		if err := svc.ConfirmPasswordReset(context.Background(), tc.token, tc.pass, tc.confirm); !errors.Is(err, domain.ErrInvalidInput) {
			t.Errorf("ConfirmPasswordReset(%q,%q,%q) want ErrInvalidInput, got %v", tc.token, tc.pass, tc.confirm, err)
		}
	}
}

func TestAuthServiceConfirmPasswordResetTokenNotFound(t *testing.T) {
	t.Parallel()
	repo := &fakeAuthRepo{resetFindErr: domain.ErrNotFound}
	err := newSvc(repo).ConfirmPasswordReset(context.Background(), "tok", "newpass1", "newpass1")
	if !errors.Is(err, domain.ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput for unknown token, got %v", err)
	}
}

func TestAuthServiceConfirmPasswordResetExpiredToken(t *testing.T) {
	t.Parallel()
	expired := domain.PasswordResetToken{
		ID:        "rid",
		UserID:    "uid",
		ExpiresAt: time.Now().UTC().Add(-1 * time.Hour),
	}
	repo := &fakeAuthRepo{resetToken: expired}
	if err := newSvc(repo).ConfirmPasswordReset(context.Background(), "tok", "newpass1", "newpass1"); !errors.Is(err, domain.ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput for expired token, got %v", err)
	}
}

func TestAuthServiceConfirmPasswordResetUsedToken(t *testing.T) {
	t.Parallel()
	usedAt := time.Now().UTC()
	used := domain.PasswordResetToken{
		ID:        "rid",
		UserID:    "uid",
		ExpiresAt: time.Now().UTC().Add(1 * time.Hour),
		UsedAt:    &usedAt,
	}
	repo := &fakeAuthRepo{resetToken: used}
	if err := newSvc(repo).ConfirmPasswordReset(context.Background(), "tok", "newpass1", "newpass1"); !errors.Is(err, domain.ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput for used token, got %v", err)
	}
}

func TestAuthServiceConfirmPasswordResetSuccess(t *testing.T) {
	t.Parallel()
	valid := domain.PasswordResetToken{
		ID:        "rid",
		UserID:    "uid",
		ExpiresAt: time.Now().UTC().Add(1 * time.Hour),
	}
	repo := &fakeAuthRepo{resetToken: valid}
	if err := newSvc(repo).ConfirmPasswordReset(context.Background(), "tok", "newpass1", "newpass1"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

// ---- UpdateProfile ----

func TestAuthServiceUpdateProfileValidation(t *testing.T) {
	t.Parallel()
	svc := &AuthService{}
	user := domain.AuthUser{UserID: "uid", Email: "old@example.com"}
	cases := []struct {
		fn, email, curr, newp string
		desc                  string
	}{
		{"", "a@b.com", "", "", "empty fullName"},
		{"Al", "", "", "", "empty email"},
		{"Al", "a@b.com", "current", "short", "new pass < 8"},
		{"Al", "new@example.com", "", "", "email change without currentPassword"},
		{"Al", "old@example.com", "", "newpass1", "pass change without currentPassword"},
	}
	for _, tc := range cases {
		if _, err := svc.UpdateProfile(context.Background(), user, tc.fn, tc.email, tc.curr, tc.newp); !errors.Is(err, domain.ErrInvalidInput) {
			t.Errorf("[%s] want ErrInvalidInput, got %v", tc.desc, err)
		}
	}
}

func TestAuthServiceUpdateProfileEmailConflict(t *testing.T) {
	t.Parallel()
	repo := &fakeAuthRepo{emailExistsOther: true, verifyResult: true}
	user := domain.AuthUser{UserID: "uid", Email: "old@example.com"}
	if _, err := newSvc(repo).UpdateProfile(context.Background(), user, "Alice", "taken@example.com", "currentpass", ""); !errors.Is(err, domain.ErrConflict) {
		t.Fatalf("expected ErrConflict, got %v", err)
	}
}

func TestAuthServiceUpdateProfileWrongCurrentPassword(t *testing.T) {
	t.Parallel()
	repo := &fakeAuthRepo{verifyResult: false}
	user := domain.AuthUser{UserID: "uid", Email: "old@example.com"}
	if _, err := newSvc(repo).UpdateProfile(context.Background(), user, "Alice", "new@example.com", "wrongpass", ""); !errors.Is(err, domain.ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput for wrong password, got %v", err)
	}
}

func TestAuthServiceUpdateProfileSuccess(t *testing.T) {
	t.Parallel()
	repo := &fakeAuthRepo{verifyResult: true}
	user := domain.AuthUser{UserID: "uid", Email: "old@example.com", SessionID: "sess-1"}
	updated, err := newSvc(repo).UpdateProfile(context.Background(), user, "Alice New", "new@example.com", "currentpass", "newpass1!")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if updated.SessionID != "sess-1" {
		t.Fatal("session id should be preserved after update")
	}
}

func TestAuthServiceUpdateProfileNoSensitiveChange(t *testing.T) {
	t.Parallel()
	// Only name change (same email, no new password) — no currentPassword needed.
	repo := &fakeAuthRepo{}
	user := domain.AuthUser{UserID: "uid", Email: "same@example.com"}
	if _, err := newSvc(repo).UpdateProfile(context.Background(), user, "New Name", "same@example.com", "", ""); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}
