package httptransport

import (
	"context"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/alfiang/pui/environment-a/api-service/internal/config"
	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"github.com/alfiang/pui/environment-a/api-service/internal/middleware"
	"github.com/alfiang/pui/environment-a/api-service/internal/service"
	"github.com/alfiang/pui/environment-a/api-service/internal/transport/http/dto"
	"github.com/alfiang/pui/environment-a/api-service/internal/vaultclient"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

type authServiceInterface interface {
	Login(ctx context.Context, email, password string) (domain.LoginResult, error)
	Register(ctx context.Context, fullName, email, password, confirmPassword string) (domain.AuthUser, error)
	RequestPasswordReset(ctx context.Context, email string) error
	ConfirmPasswordReset(ctx context.Context, token, newPassword, confirmPassword string) error
	AuthenticateToken(ctx context.Context, bearerToken string) (domain.AuthUser, error)
	Logout(ctx context.Context, user domain.AuthUser) error
	UpdateProfile(ctx context.Context, user domain.AuthUser, fullName, email, currentPassword, newPassword string) (domain.AuthUser, error)
}

type directoryServiceInterface interface {
	Create(ctx context.Context, user domain.AuthUser, name, parentID string) (domain.DirectoryRecord, error)
	Tree(ctx context.Context, user domain.AuthUser, rootID string) ([]domain.DirectoryRecord, error)
	Breadcrumb(ctx context.Context, user domain.AuthUser, directoryID string) ([]domain.DirectoryRecord, error)
	SoftDelete(ctx context.Context, user domain.AuthUser, directoryID string) (domain.DirectoryRecord, error)
	Restore(ctx context.Context, user domain.AuthUser, directoryID string) (domain.DirectoryRecord, error)
	PermanentDelete(ctx context.Context, user domain.AuthUser, directoryID string) error
	SetStarred(ctx context.Context, user domain.AuthUser, directoryID string, starred bool) (domain.DirectoryRecord, error)
	Trash(ctx context.Context, user domain.AuthUser) ([]domain.DirectoryRecord, error)
	Starred(ctx context.Context, user domain.AuthUser) ([]domain.DirectoryRecord, error)
	TrashPage(ctx context.Context, user domain.AuthUser, limit, offset int) ([]domain.DirectoryRecord, int64, int, int, error)
	StarredPage(ctx context.Context, user domain.AuthUser, limit, offset int) ([]domain.DirectoryRecord, int64, int, int, error)
}

type fileServiceInterface interface {
	ListByDirectory(ctx context.Context, user domain.AuthUser, directoryID string, includeDeleted bool) ([]domain.FileRecord, error)
	ListByDirectoryPage(ctx context.Context, user domain.AuthUser, filter domain.FileListFilter) ([]domain.FileRecord, int64, domain.FileListStats, int, int, error)
	Upload(ctx context.Context, user domain.AuthUser, directoryID, fileName, mimeType string, reader io.Reader) (service.UploadOutcome, error)
	Detail(ctx context.Context, user domain.AuthUser, fileID string, includeDeleted bool) (domain.FileRecord, error)
	Download(ctx context.Context, user domain.AuthUser, fileID string, includeDeleted bool) (service.DownloadOutcome, error)
	SoftDelete(ctx context.Context, user domain.AuthUser, fileID string) (time.Time, error)
	Restore(ctx context.Context, user domain.AuthUser, fileID string) (domain.FileRecord, error)
	PermanentDelete(ctx context.Context, user domain.AuthUser, fileID string) error
	SetStarred(ctx context.Context, user domain.AuthUser, fileID string, starred bool) (domain.FileRecord, error)
	Search(ctx context.Context, user domain.AuthUser, query, directoryID string, includeDeleted bool, limit, offset int) ([]domain.FileRecord, int64, int, int, error)
	GetManifestInfo(ctx context.Context, manifestID string) (vaultclient.ManifestRecord, error)
	Trash(ctx context.Context, user domain.AuthUser) ([]domain.FileRecord, error)
	Starred(ctx context.Context, user domain.AuthUser) ([]domain.FileRecord, error)
	TrashPage(ctx context.Context, user domain.AuthUser, limit, offset int) ([]domain.FileRecord, int64, int, int, error)
	StarredPage(ctx context.Context, user domain.AuthUser, limit, offset int) ([]domain.FileRecord, int64, int, int, error)
}

type adminServiceInterface interface {
	Analytics(ctx context.Context, user domain.AuthUser, rawRange string) (domain.AdminAnalytics, error)
}

type insightServiceInterface interface {
	UserInsight(ctx context.Context, user domain.AuthUser, rawRange string) (domain.UserInsight, error)
}

type activityServiceInterface interface {
	List(ctx context.Context, user domain.AuthUser, action, resourceType string, limit, offset int) ([]domain.ActivityLogRecord, int64, int, int, error)
}

type securityLabServiceInterface interface {
	Run(ctx context.Context, user domain.AuthUser, emit service.EmitFunc) (service.SecurityLabSummary, error)
}

type securityMonitoringServiceInterface interface {
	List(ctx context.Context, filter domain.SecurityEventFilter) ([]domain.SecurityEventRecord, int64, int, int, error)
	Summary(ctx context.Context, since, until time.Time) (domain.SecurityEventSummary, error)
	Subscribe() (<-chan domain.SecurityEventRecord, func())
}

type API struct {
	cfg                       config.Config
	authService               authServiceInterface
	adminService              adminServiceInterface
	activityService           activityServiceInterface
	directoryService          directoryServiceInterface
	fileService               fileServiceInterface
	insightService            insightServiceInterface
	systemService             *service.SystemService
	securityLabService        securityLabServiceInterface
	securityMonitoringService securityMonitoringServiceInterface
	validator                 *validator.Validate
}

func NewAPI(
	cfg config.Config,
	authService *service.AuthService,
	adminService *service.AdminService,
	activityService *service.ActivityService,
	directoryService *service.DirectoryService,
	fileService *service.FileService,
	insightService *service.InsightService,
	systemService *service.SystemService,
	securityLabService *service.SecurityLabService,
	securityMonitoringService *service.SecurityMonitoringService,
) *API {
	return &API{
		cfg:                       cfg,
		authService:               authService,
		adminService:              adminService,
		activityService:           activityService,
		directoryService:          directoryService,
		fileService:               fileService,
		insightService:            insightService,
		systemService:             systemService,
		securityLabService:        securityLabService,
		securityMonitoringService: securityMonitoringService,
		validator:                 validator.New(validator.WithRequiredStructEnabled()),
	}
}

func (a *API) bindAndValidateJSON(c *gin.Context, payload any) bool {
	if err := c.ShouldBindJSON(payload); err != nil {
		writeError(c, http.StatusBadRequest, err)
		return false
	}

	if err := a.validator.Struct(payload); err != nil {
		writeError(c, http.StatusBadRequest, err)
		return false
	}

	return true
}

func (a *API) authUser(c *gin.Context) (domain.AuthUser, bool) {
	user, ok := middleware.MustAuthUser(c)
	if !ok {
		writeError(c, http.StatusUnauthorized, domain.ErrUnauthorized)
		return domain.AuthUser{}, false
	}

	return user, true
}

func readBearerToken(header string) string {
	header = strings.TrimSpace(header)
	if header == "" {
		return ""
	}
	parts := strings.SplitN(header, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return ""
	}
	return strings.TrimSpace(parts[1])
}

func parseBoolQuery(value string) bool {
	return strings.EqualFold(strings.TrimSpace(value), "true")
}

func toLoginResponse(result domain.LoginResult) dto.LoginResponse {
	return dto.LoginResponse{
		Status:      "ok",
		AccessToken: result.AccessToken,
		ExpiresAt:   result.ExpiresAt.Format("2006-01-02T15:04:05Z07:00"),
		User:        toUserDTO(result.User),
	}
}
