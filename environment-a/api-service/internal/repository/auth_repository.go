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
		`SELECT id::text AS user_id, full_name, email, role
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
		`INSERT INTO access_sessions (user_id, access_token_hash, expires_at)
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

func (r *AuthRepository) CreateUser(ctx context.Context, fullName, email, password string) (domain.AuthUser, error) {
	var user domain.AuthUser
	err := r.db.WithContext(ctx).Raw(
		`INSERT INTO users (full_name, email, password_hash, role)
		 VALUES (?, ?, crypt(?, gen_salt('bf')), 'user')
		 RETURNING id::text AS user_id, full_name, email, role`,
		fullName,
		email,
		password,
	).Scan(&user).Error
	if err != nil {
		return domain.AuthUser{}, fmt.Errorf("create user: %w", err)
	}

	if user.UserID == "" {
		return domain.AuthUser{}, errors.New("empty user id from insert")
	}

	return user, nil
}

func (r *AuthRepository) FindSessionUserByTokenHash(ctx context.Context, tokenHash string) (domain.AuthUser, error) {
	var user domain.AuthUser
	err := r.db.WithContext(ctx).Raw(
		`SELECT s.id::text AS session_id, u.id::text AS user_id, u.full_name, u.email, u.role
		 FROM access_sessions s
		 JOIN users u ON u.id = s.user_id
		 WHERE s.access_token_hash = ?
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

func (r *AuthRepository) EmailExists(ctx context.Context, email string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Raw(
		`SELECT COUNT(1)
		 FROM users
		 WHERE email = ?`,
		email,
	).Scan(&count).Error
	if err != nil {
		return false, fmt.Errorf("query email existence: %w", err)
	}

	return count > 0, nil
}

func (r *AuthRepository) EmailExistsForOtherUser(ctx context.Context, email, userID string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Raw(
		`SELECT COUNT(1)
		 FROM users
		 WHERE email = ?
		   AND id <> ?`,
		email,
		userID,
	).Scan(&count).Error
	if err != nil {
		return false, fmt.Errorf("query email owner: %w", err)
	}

	return count > 0, nil
}

func (r *AuthRepository) VerifyUserPassword(ctx context.Context, userID, password string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Raw(
		`SELECT COUNT(1)
		 FROM users
		 WHERE id = ?
		   AND password_hash = crypt(?, password_hash)`,
		userID,
		password,
	).Scan(&count).Error
	if err != nil {
		return false, fmt.Errorf("verify user password: %w", err)
	}

	return count > 0, nil
}

func (r *AuthRepository) UpdateUserProfile(ctx context.Context, userID, fullName, email, newPassword string) (domain.AuthUser, error) {
	var user domain.AuthUser
	var err error
	if newPassword != "" {
		err = r.db.WithContext(ctx).Raw(
			`UPDATE users
			 SET full_name = ?, email = ?, password_hash = crypt(?, gen_salt('bf'))
			 WHERE id = ?
			 RETURNING id::text AS user_id, full_name, email, role`,
			fullName,
			email,
			newPassword,
			userID,
		).Scan(&user).Error
	} else {
		err = r.db.WithContext(ctx).Raw(
			`UPDATE users
			 SET full_name = ?, email = ?
			 WHERE id = ?
			 RETURNING id::text AS user_id, full_name, email, role`,
			fullName,
			email,
			userID,
		).Scan(&user).Error
	}
	if err != nil {
		return domain.AuthUser{}, fmt.Errorf("update user profile: %w", err)
	}

	if user.UserID == "" {
		return domain.AuthUser{}, domain.ErrNotFound
	}

	return user, nil
}

func (r *AuthRepository) RevokeOtherSessions(ctx context.Context, userID, currentSessionID string) error {
	result := r.db.WithContext(ctx).Exec(
		`UPDATE access_sessions
		 SET revoked_at = NOW()
		 WHERE user_id = ?
		   AND id <> ?
		   AND revoked_at IS NULL`,
		userID,
		currentSessionID,
	)
	if result.Error != nil {
		return fmt.Errorf("revoke other sessions: %w", result.Error)
	}

	return nil
}
