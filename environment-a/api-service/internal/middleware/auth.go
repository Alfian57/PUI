package middleware

import (
	"net/http"
	"strings"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"github.com/alfiang/pui/environment-a/api-service/internal/service"
	"github.com/gin-gonic/gin"
)

func Auth(authService *service.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := extractBearerToken(c.GetHeader("Authorization"))
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "error": domain.ErrUnauthorized.Error()})
			c.Abort()
			return
		}

		user, err := authService.AuthenticateToken(c.Request.Context(), token)
		if err != nil {
			status := http.StatusInternalServerError
			if err == domain.ErrUnauthorized {
				status = http.StatusUnauthorized
			}
			c.JSON(status, gin.H{"status": "error", "error": err.Error()})
			c.Abort()
			return
		}

		SetAuthUser(c, user)
		c.Next()
	}
}

func extractBearerToken(header string) string {
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
