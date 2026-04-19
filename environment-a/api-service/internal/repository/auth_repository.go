package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"gorm.io/gorm"
)

type AuthRepository struct {
	db *gorm.DB
}

func NewAuthRepository(db *gorm.DB) *AuthRepository {
	return &AuthRepository{db: db}
}

func (r *AuthRepository) FindUserByCredentials(ctx context.Context, email, password string) (domain.AuthUser, error) {
	var user domain.AuthUser
	err := r.db.WithContext(ctx).Raw(
		`SELECT id::text AS user_id, full_name, email
		 FROM users
		 WHERE email = ?
		   AND password_hash = crypt(?, password_hash)`,
		email,
		password,
	).Scan(&user).Error
	if err != nil {
		return domain.AuthUser{}, fmt.Errorf("query user credentials: %w", err)
	}

	if user.UserID == "" {
		return domain.AuthUser{}, domain.ErrUnauthorized
	}

	return user, nil
}

func (r *AuthRepository) CreateSession(ctx context.Context, userID, tokenHash string, expiresAt time.Time) (string, error) {
	var sessionID string
	err := r.db.WithContext(ctx).Raw(
		`INSERT INTO access_sessions (user_id, refresh_token_hash, expires_at)
		 VALUES (?, ?, ?)
		 RETURNING id::text`,
		userID,
		tokenHash,
		expiresAt,
	).Scan(&sessionID).Error
	if err != nil {
		return "", fmt.Errorf("insert access session: %w", err)
	}

	if sessionID == "" {
		return "", errors.New("empty session id from insert")
	}

	return sessionID, nil
}

func (r *AuthRepository) FindSessionUserByTokenHash(ctx context.Context, tokenHash string) (domain.AuthUser, error) {
	var user domain.AuthUser
	err := r.db.WithContext(ctx).Raw(
		`SELECT s.id::text AS session_id, u.id::text AS user_id, u.full_name, u.email
		 FROM access_sessions s
		 JOIN users u ON u.id = s.user_id
		 WHERE s.refresh_token_hash = ?
		   AND s.revoked_at IS NULL
		   AND s.expires_at > NOW()`,
		tokenHash,
	).Scan(&user).Error
	if err != nil {
		return domain.AuthUser{}, fmt.Errorf("query session user: %w", err)
	}

	if user.UserID == "" {
		return domain.AuthUser{}, domain.ErrUnauthorized
	}

	return user, nil
}

func (r *AuthRepository) RevokeSession(ctx context.Context, sessionID string) error {
	result := r.db.WithContext(ctx).Exec(
		`UPDATE access_sessions SET revoked_at = NOW() WHERE id = ? AND revoked_at IS NULL`,
		sessionID,
	)
	if result.Error != nil {
		return fmt.Errorf("revoke session: %w", result.Error)
	}

	return nil
}
