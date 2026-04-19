package httptransport

import (
	"net/http"
	"strings"

	"github.com/alfiang/pui/environment-a/api-service/internal/config"
	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"github.com/alfiang/pui/environment-a/api-service/internal/middleware"
	"github.com/alfiang/pui/environment-a/api-service/internal/service"
	"github.com/alfiang/pui/environment-a/api-service/internal/transport/http/dto"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

type API struct {
	cfg              config.Config
	authService      *service.AuthService
	activityService  *service.ActivityService
	directoryService *service.DirectoryService
	fileService      *service.FileService
	systemService    *service.SystemService
	validator        *validator.Validate
}

func NewAPI(
	cfg config.Config,
	authService *service.AuthService,
	activityService *service.ActivityService,
	directoryService *service.DirectoryService,
	fileService *service.FileService,
	systemService *service.SystemService,
) *API {
	return &API{
		cfg:              cfg,
		authService:      authService,
		activityService:  activityService,
		directoryService: directoryService,
		fileService:      fileService,
		systemService:    systemService,
		validator:        validator.New(validator.WithRequiredStructEnabled()),
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
