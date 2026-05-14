package httptransport

import (
	"net/http"

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
		writeError(c, status, err)
		return
	}

	c.JSON(http.StatusOK, toLoginResponse(result))
}

// handleRegister godoc
// @Summary Register user
// @Description Create a new user account with user role
// @Tags auth
// @Accept json
// @Produce json
// @Param payload body dto.RegisterRequest true "Register payload"
// @Success 201 {object} dto.MeResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 409 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /auth/register [post]
func (a *API) handleRegister(c *gin.Context) {
	var req dto.RegisterRequest
	if !a.bindAndValidateJSON(c, &req) {
		return
	}

	user, err := a.authService.Register(c.Request.Context(), req.FullName, req.Email, req.Password, req.ConfirmPassword)
	if err != nil {
		writeError(c, statusFromError(err), err)
		return
	}

	c.JSON(http.StatusCreated, dto.MeResponse{
		Status: "ok",
		User:   toUserDTO(user),
	})
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

// handleUpdateProfile godoc
// @Summary Update profile
// @Description Update authenticated user profile and optionally change password
// @Tags auth
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param payload body dto.UpdateProfileRequest true "Profile payload"
// @Success 200 {object} dto.MeResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 409 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /auth/me [patch]
func (a *API) handleUpdateProfile(c *gin.Context) {
	user, ok := a.authUser(c)
	if !ok {
		return
	}

	var req dto.UpdateProfileRequest
	if !a.bindAndValidateJSON(c, &req) {
		return
	}

	updatedUser, err := a.authService.UpdateProfile(
		c.Request.Context(),
		user,
		req.FullName,
		req.Email,
		req.CurrentPassword,
		req.NewPassword,
	)
	if err != nil {
		writeError(c, statusFromError(err), err)
		return
	}

	c.JSON(http.StatusOK, dto.MeResponse{
		Status: "ok",
		User:   toUserDTO(updatedUser),
	})
}
