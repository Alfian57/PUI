package httptransport

import (
	"errors"
	"net/http"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"github.com/gin-gonic/gin"
)

func writeError(c *gin.Context, status int, err error) {
	c.JSON(status, gin.H{"status": "error", "error": err.Error()})
}

func statusFromError(err error) int {
	switch {
	case errors.Is(err, domain.ErrUnauthorized):
		return http.StatusUnauthorized
	case errors.Is(err, domain.ErrConflict):
		return http.StatusConflict
	case errors.Is(err, domain.ErrNotFound):
		return http.StatusNotFound
	case errors.Is(err, domain.ErrInvalidInput):
		return http.StatusBadRequest
	case errors.Is(err, domain.ErrUploadTooBig):
		return http.StatusRequestEntityTooLarge
	default:
		return http.StatusInternalServerError
	}
}
