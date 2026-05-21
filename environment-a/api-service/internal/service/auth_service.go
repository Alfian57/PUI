package service

import (
	"context"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"github.com/alfiang/pui/environment-a/api-service/internal/repository"
)

type AuthService struct {
	authRepo         *repository.AuthRepository
	activityRepo     *repository.ActivityRepository
	sessionTTLMinute int
	resetTTLMinute   int
	publicWebURL     string
	resetMailer      PasswordResetMailer
}

type PasswordResetMailer interface {
	SendPasswordReset(ctx context.Context, toEmail, toName, resetURL string) error
}

func NewAuthService(
	authRepo *repository.AuthRepository,
	activityRepo *repository.ActivityRepository,
	sessionTTLMinute int,
	resetTTLMinute int,
	publicWebURL string,
	resetMailer PasswordResetMailer,
) *AuthService {
	return &AuthService{
		authRepo:         authRepo,
		activityRepo:     activityRepo,
		sessionTTLMinute: sessionTTLMinute,
		resetTTLMinute:   resetTTLMinute,
		publicWebURL:     strings.TrimRight(strings.TrimSpace(publicWebURL), "/"),
		resetMailer:      resetMailer,
	}
}

func (s *AuthService) Login(ctx context.Context, email, password string) (domain.LoginResult, error) {
	email = strings.TrimSpace(strings.ToLower(email))
	password = strings.TrimSpace(password)
	if email == "" || password == "" {
		return domain.LoginResult{}, domain.NewValidationError("email dan password wajib diisi")
	}

	user, err := s.authRepo.FindUserByCredentials(ctx, email, password)
	if err != nil {
		return domain.LoginResult{}, err
	}

	token, tokenHash, err := NewSessionToken()
	if err != nil {
		return domain.LoginResult{}, fmt.Errorf("generate session token: %w", err)
	}

	expiresAt := time.Now().UTC().Add(time.Duration(s.sessionTTLMinute) * time.Minute)
	sessionID, err := s.authRepo.CreateSession(ctx, user.UserID, tokenHash, expiresAt)
	if err != nil {
		return domain.LoginResult{}, err
	}

	user.SessionID = sessionID
	if logErr := s.activityRepo.Log(ctx, user.UserID, "LOGIN", "SESSION", &sessionID); logErr != nil {
		// Avoid failing login due to audit insertion failure.
	}

	return domain.LoginResult{
		AccessToken: token,
		ExpiresAt:   expiresAt,
		User:        user,
	}, nil
}

func (s *AuthService) Register(ctx context.Context, fullName, email, password, confirmPassword string) (domain.AuthUser, error) {
	fullName = strings.TrimSpace(fullName)
	email = strings.TrimSpace(strings.ToLower(email))
	password = strings.TrimSpace(password)
	confirmPassword = strings.TrimSpace(confirmPassword)

	if fullName == "" || email == "" || password == "" || confirmPassword == "" {
		return domain.AuthUser{}, domain.NewValidationError("nama, email, password, dan konfirmasi password wajib diisi")
	}

	if len(fullName) < 2 || len(fullName) > 150 {
		return domain.AuthUser{}, domain.NewValidationError("nama harus 2-150 karakter")
	}

	if len(password) < 8 {
		return domain.AuthUser{}, domain.NewValidationError("password minimal 8 karakter")
	}

	if password != confirmPassword {
		return domain.AuthUser{}, domain.NewValidationError("konfirmasi password belum sama")
	}

	exists, err := s.authRepo.EmailExists(ctx, email)
	if err != nil {
		return domain.AuthUser{}, err
	}
	if exists {
		return domain.AuthUser{}, fmt.Errorf("email sudah terdaftar: %w", domain.ErrConflict)
	}

	user, err := s.authRepo.CreateUser(ctx, fullName, email, password)
	if err != nil {
		return domain.AuthUser{}, err
	}

	if logErr := s.activityRepo.Log(ctx, user.UserID, "REGISTER", "USER", &user.UserID); logErr != nil {
		// Keep registration successful even if audit logging fails.
	}

	return user, nil
}

func (s *AuthService) RequestPasswordReset(ctx context.Context, email string) error {
	email = strings.TrimSpace(strings.ToLower(email))
	if email == "" {
		return domain.NewValidationError("email wajib diisi")
	}

	user, found, err := s.authRepo.FindUserByEmail(ctx, email)
	if err != nil {
		return err
	}
	if !found {
		return nil
	}
	if s.resetMailer == nil {
		return fmt.Errorf("password reset mailer is not configured")
	}
	if s.publicWebURL == "" {
		return fmt.Errorf("PUBLIC_WEB_URL is required for password reset")
	}

	token, tokenHash, err := NewSessionToken()
	if err != nil {
		return fmt.Errorf("generate password reset token: %w", err)
	}

	expiresAt := time.Now().UTC().Add(time.Duration(s.resetTTLMinute) * time.Minute)
	resetID, err := s.authRepo.CreatePasswordResetToken(ctx, user.UserID, tokenHash, expiresAt)
	if err != nil {
		return err
	}

	resetURL := s.publicWebURL + "/reset-password?token=" + url.QueryEscape(token)
	if err := s.resetMailer.SendPasswordReset(ctx, user.Email, user.FullName, resetURL); err != nil {
		return err
	}

	if logErr := s.activityRepo.Log(ctx, user.UserID, "REQUEST_PASSWORD_RESET", "PASSWORD_RESET_TOKEN", &resetID); logErr != nil {
		// Keep reset request resilient to audit insertion failure.
	}

	return nil
}

func (s *AuthService) ConfirmPasswordReset(ctx context.Context, token, newPassword, confirmPassword string) error {
	token = strings.TrimSpace(token)
	newPassword = strings.TrimSpace(newPassword)
	confirmPassword = strings.TrimSpace(confirmPassword)
	if token == "" || newPassword == "" || confirmPassword == "" {
		return domain.NewValidationError("token, password baru, dan konfirmasi password wajib diisi")
	}
	if len(newPassword) < 8 {
		return domain.NewValidationError("password baru minimal 8 karakter")
	}
	if newPassword != confirmPassword {
		return domain.NewValidationError("konfirmasi password belum sama")
	}

	resetToken, err := s.authRepo.FindPasswordResetToken(ctx, HashToken(token))
	if err != nil {
		if err == domain.ErrNotFound {
			return domain.NewValidationError("token reset password tidak valid atau sudah kedaluwarsa")
		}
		return err
	}
	if resetToken.UsedAt != nil || time.Now().UTC().After(resetToken.ExpiresAt) {
		return domain.NewValidationError("token reset password tidak valid atau sudah kedaluwarsa")
	}

	if err := s.authRepo.CompletePasswordReset(ctx, resetToken.ID, resetToken.UserID, newPassword); err != nil {
		return err
	}

	if logErr := s.activityRepo.Log(ctx, resetToken.UserID, "CONFIRM_PASSWORD_RESET", "PASSWORD_RESET_TOKEN", &resetToken.ID); logErr != nil {
		// Keep reset confirmation resilient to audit insertion failure.
	}

	return nil
}

func (s *AuthService) AuthenticateToken(ctx context.Context, bearerToken string) (domain.AuthUser, error) {
	if strings.TrimSpace(bearerToken) == "" {
		return domain.AuthUser{}, domain.ErrUnauthorized
	}

	tokenHash := HashToken(strings.TrimSpace(bearerToken))
	return s.authRepo.FindSessionUserByTokenHash(ctx, tokenHash)
}

func (s *AuthService) Logout(ctx context.Context, user domain.AuthUser) error {
	if err := s.authRepo.RevokeSession(ctx, user.SessionID); err != nil {
		return err
	}

	if logErr := s.activityRepo.Log(ctx, user.UserID, "LOGOUT", "SESSION", &user.SessionID); logErr != nil {
		// Keep logout idempotent and resilient to logging failure.
	}

	return nil
}

func (s *AuthService) UpdateProfile(ctx context.Context, user domain.AuthUser, fullName, email, currentPassword, newPassword string) (domain.AuthUser, error) {
	fullName = strings.TrimSpace(fullName)
	email = strings.TrimSpace(strings.ToLower(email))
	currentPassword = strings.TrimSpace(currentPassword)
	newPassword = strings.TrimSpace(newPassword)

	if fullName == "" || email == "" {
		return domain.AuthUser{}, domain.NewValidationError("nama dan email wajib diisi")
	}

	if len(fullName) < 2 || len(fullName) > 150 {
		return domain.AuthUser{}, domain.NewValidationError("nama harus 2-150 karakter")
	}

	if newPassword != "" && len(newPassword) < 8 {
		return domain.AuthUser{}, domain.NewValidationError("password baru minimal 8 karakter")
	}

	emailChanged := !strings.EqualFold(email, user.Email)
	passwordChanged := newPassword != ""
	if (emailChanged || passwordChanged) && currentPassword == "" {
		return domain.AuthUser{}, domain.NewValidationError("password saat ini wajib diisi")
	}

	exists, err := s.authRepo.EmailExistsForOtherUser(ctx, email, user.UserID)
	if err != nil {
		return domain.AuthUser{}, err
	}
	if exists {
		return domain.AuthUser{}, domain.ErrConflict
	}

	if emailChanged || passwordChanged {
		valid, err := s.authRepo.VerifyUserPassword(ctx, user.UserID, currentPassword)
		if err != nil {
			return domain.AuthUser{}, err
		}
		if !valid {
			return domain.AuthUser{}, domain.NewValidationError("password saat ini tidak sesuai")
		}
	}

	updatedUser, err := s.authRepo.UpdateUserProfile(ctx, user.UserID, fullName, email, newPassword)
	if err != nil {
		return domain.AuthUser{}, err
	}
	updatedUser.SessionID = user.SessionID

	if passwordChanged {
		if err := s.authRepo.RevokeOtherSessions(ctx, user.UserID, user.SessionID); err != nil {
			return domain.AuthUser{}, err
		}
	}

	if logErr := s.activityRepo.Log(ctx, user.UserID, "UPDATE_PROFILE", "USER", &user.UserID); logErr != nil {
		// Keep profile update resilient to audit insertion failure.
	}

	return updatedUser, nil
}
