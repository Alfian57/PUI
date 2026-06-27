package middleware

import (
	"context"
	"errors"
	"log"
	"net/http"
	"strings"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"github.com/gin-gonic/gin"
)

type authTokenValidator interface {
	AuthenticateToken(ctx context.Context, bearerToken string) (domain.AuthUser, error)
}

func Auth(authService authTokenValidator) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := extractBearerToken(c.GetHeader("Authorization"))
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "error": domain.ErrUnauthorized.Error()})
			c.Abort()
			return
		}

		user, err := authService.AuthenticateToken(c.Request.Context(), token)
		if err != nil {
			if errors.Is(err, domain.ErrUnauthorized) {
				c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "error": "unauthorized"})
				c.Abort()
				return
			}
			log.Printf("event=auth_internal_error err=%v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "error": "internal error"})
			c.Abort()
			return
		}

		SetAuthUser(c, user)
		c.Next()
	}
}

func RequireRole(role string) gin.HandlerFunc {
	return func(c *gin.Context) {
		user, ok := MustAuthUser(c)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "error": domain.ErrUnauthorized.Error()})
			c.Abort()
			return
		}

		if !strings.EqualFold(user.Role, role) {
			c.JSON(http.StatusForbidden, gin.H{"status": "error", "error": domain.ErrForbidden.Error()})
			c.Abort()
			return
		}

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
