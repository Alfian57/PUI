package middleware

import (
	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"github.com/gin-gonic/gin"
)

const authUserContextKey = "auth_user"

func SetAuthUser(c *gin.Context, user domain.AuthUser) {
	c.Set(authUserContextKey, user)
}

func MustAuthUser(c *gin.Context) (domain.AuthUser, bool) {
	value, ok := c.Get(authUserContextKey)
	if !ok {
		return domain.AuthUser{}, false
	}

	user, ok := value.(domain.AuthUser)
	if !ok || user.UserID == "" {
		return domain.AuthUser{}, false
	}

	return user, true
}
