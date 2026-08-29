package service

import (
	"context"
	"time"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
)

// activityLogger is shared across AuthService, DirectoryService, and FileService.
type activityLogger interface {
	Log(ctx context.Context, userID, action, resourceType string, resourceID *string) error
}

// SecurityEventRecorder is used by HTTP middleware and the Vault bridge. A
// recorder failure must never turn a request that has already been handled into
// a different security outcome.
type SecurityEventRecorder interface {
	Record(ctx context.Context, input domain.SecurityEventInput) (domain.SecurityEventRecord, error)
}

// authRepository is the minimal interface required by AuthService.
type authRepository interface {
	FindUserByCredentials(ctx context.Context, email, password string) (domain.AuthUser, error)
	CreateSession(ctx context.Context, userID, tokenHash string, expiresAt time.Time) (string, error)
	EmailExists(ctx context.Context, email string) (bool, error)
	CreateUser(ctx context.Context, fullName, email, password string) (domain.AuthUser, error)
	FindUserByEmail(ctx context.Context, email string) (domain.AuthUser, bool, error)
	CreatePasswordResetToken(ctx context.Context, userID, tokenHash string, expiresAt time.Time) (string, error)
	FindPasswordResetToken(ctx context.Context, tokenHash string) (domain.PasswordResetToken, error)
	CompletePasswordReset(ctx context.Context, resetID, userID, newPassword string) error
	FindSessionUserByTokenHash(ctx context.Context, tokenHash string) (domain.AuthUser, error)
	RevokeSession(ctx context.Context, sessionID string) error
	EmailExistsForOtherUser(ctx context.Context, email, userID string) (bool, error)
	VerifyUserPassword(ctx context.Context, userID, password string) (bool, error)
	UpdateUserProfile(ctx context.Context, userID, fullName, email, newPassword string) (domain.AuthUser, error)
	RevokeOtherSessions(ctx context.Context, userID, currentSessionID string) error
}

// directoryRepository is the minimal interface required by DirectoryService.
type directoryRepository interface {
	Create(ctx context.Context, userID, name, parentID string) (domain.DirectoryRecord, error)
	Tree(ctx context.Context, userID, rootID string) ([]domain.DirectoryRecord, error)
	Breadcrumb(ctx context.Context, userID, directoryID string) ([]domain.DirectoryRecord, error)
	IsOwnedByUser(ctx context.Context, directoryID, userID string) (bool, error)
	SoftDeleteSubtree(ctx context.Context, directoryID, userID string) (domain.DirectoryRecord, error)
	RestoreSubtree(ctx context.Context, directoryID, userID string) (domain.DirectoryRecord, error)
	PermanentDeleteSubtree(ctx context.Context, directoryID, userID string) error
	SetStarred(ctx context.Context, directoryID, userID string, starred bool) (domain.DirectoryRecord, error)
	ListTrashRoots(ctx context.Context, userID string) ([]domain.DirectoryRecord, error)
	ListStarred(ctx context.Context, userID string) ([]domain.DirectoryRecord, error)
	ListTrashRootsPage(ctx context.Context, userID string, limit, offset int) ([]domain.DirectoryRecord, int64, error)
	ListStarredPage(ctx context.Context, userID string, limit, offset int) ([]domain.DirectoryRecord, int64, error)
}
