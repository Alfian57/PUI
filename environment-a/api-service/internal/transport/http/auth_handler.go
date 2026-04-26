package httptransport

import (
	"errors"
	"net/http"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"github.com/alfiang/pui/environment-a/api-service/internal/transport/http/dto"
	"github.com/gin-gonic/gin"
)

// handleLogin godoc
// @Summary Login
// @Description Create bearer access token for the active session from email and password
// @Tags auth
// @Accept json
// @Produce json
// @Param payload body dto.LoginRequest true "Login payload"
// @Success 200 {object} dto.LoginResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /auth/login [post]
func (a *API) handleLogin(c *gin.Context) {
	var req dto.LoginRequest
	if !a.bindAndValidateJSON(c, &req) {
		return
	}

	result, err := a.authService.Login(c.Request.Context(), req.Email, req.Password)
	if err != nil {
		status := statusFromError(err)
		if errors.Is(err, domain.ErrUnauthorized) {
			status = http.StatusUnauthorized
		}
		if status == http.StatusInternalServerError && err.Error() == "email dan password wajib diisi" {
			status = http.StatusBadRequest
		}
		writeError(c, status, err)
		return
	}

	c.JSON(http.StatusOK, toLoginResponse(result))
}

// handleLogout godoc
// @Summary Logout
// @Description Revoke current access session
// @Tags auth
// @Security BearerAuth
// @Produce json
// @Success 200 {object} dto.OKResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /auth/logout [post]
func (a *API) handleLogout(c *gin.Context) {
	user, ok := a.authUser(c)
	if !ok {
		return
	}

	if err := a.authService.Logout(c.Request.Context(), user); err != nil {
		writeError(c, http.StatusInternalServerError, err)
		return
	}

	c.JSON(http.StatusOK, dto.OKResponse{Status: "ok"})
}

// handleMe godoc
// @Summary Current user
// @Description Return authenticated user profile
// @Tags auth
// @Security BearerAuth
// @Produce json
// @Success 200 {object} dto.MeResponse
// @Failure 401 {object} dto.ErrorResponse
// @Router /auth/me [get]
func (a *API) handleMe(c *gin.Context) {
	user, ok := a.authUser(c)
	if !ok {
		return
	}

	c.JSON(http.StatusOK, dto.MeResponse{
		Status: "ok",
		User:   toUserDTO(user),
	})
}
