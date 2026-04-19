package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"github.com/alfiang/pui/environment-a/api-service/internal/repository"
)

type AuthService struct {
	authRepo         *repository.AuthRepository
	activityRepo     *repository.ActivityRepository
	sessionTTLMinute int
}

func NewAuthService(authRepo *repository.AuthRepository, activityRepo *repository.ActivityRepository, sessionTTLMinute int) *AuthService {
	return &AuthService{
		authRepo:         authRepo,
		activityRepo:     activityRepo,
		sessionTTLMinute: sessionTTLMinute,
	}
}

func (s *AuthService) Login(ctx context.Context, email, password string) (domain.LoginResult, error) {
	email = strings.TrimSpace(strings.ToLower(email))
	password = strings.TrimSpace(password)
	if email == "" || password == "" {
		return domain.LoginResult{}, fmt.Errorf("email dan password wajib diisi")
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
