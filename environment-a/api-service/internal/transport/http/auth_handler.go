package httptransport

import (
	"net/http"

	"github.com/alfiang/pui/environment-a/api-service/internal/transport/http/dto"
	"github.com/gin-gonic/gin"
)

// handleLogin godoc
// @Summary Masuk
// @Description Membuat bearer access token untuk sesi aktif dari email dan password
// @Tags autentikasi
// @Accept json
// @Produce json
// @Param payload body dto.LoginRequest true "Payload masuk"
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
// @Summary Daftar pengguna
// @Description Membuat akun pengguna baru dengan peran user
// @Tags autentikasi
// @Accept json
// @Produce json
// @Param payload body dto.RegisterRequest true "Payload pendaftaran"
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

// handlePasswordResetRequest godoc
// @Summary Minta reset password
// @Description Mengirim tautan reset password ke email bila akun ditemukan
// @Tags autentikasi
// @Accept json
// @Produce json
// @Param payload body dto.PasswordResetRequest true "Payload permintaan reset password"
// @Success 200 {object} dto.OKResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /auth/password-reset/request [post]
func (a *API) handlePasswordResetRequest(c *gin.Context) {
	var req dto.PasswordResetRequest
	if !a.bindAndValidateJSON(c, &req) {
		return
	}

	if err := a.authService.RequestPasswordReset(c.Request.Context(), req.Email); err != nil {
		writeError(c, statusFromError(err), err)
		return
	}

	c.JSON(http.StatusOK, dto.OKResponse{Status: "ok"})
}

// handlePasswordResetConfirm godoc
// @Summary Konfirmasi reset password
// @Description Mengganti password menggunakan token reset yang valid
// @Tags autentikasi
// @Accept json
// @Produce json
// @Param payload body dto.PasswordResetConfirmRequest true "Payload konfirmasi reset password"
// @Success 200 {object} dto.OKResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /auth/password-reset/confirm [post]
func (a *API) handlePasswordResetConfirm(c *gin.Context) {
	var req dto.PasswordResetConfirmRequest
	if !a.bindAndValidateJSON(c, &req) {
		return
	}

	if err := a.authService.ConfirmPasswordReset(c.Request.Context(), req.Token, req.NewPassword, req.ConfirmPassword); err != nil {
		writeError(c, statusFromError(err), err)
		return
	}

	c.JSON(http.StatusOK, dto.OKResponse{Status: "ok"})
}

// handleLogout godoc
// @Summary Keluar
// @Description Mencabut sesi akses saat ini
// @Tags autentikasi
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
// @Summary Pengguna saat ini
// @Description Menampilkan profil pengguna terautentikasi
// @Tags autentikasi
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
// @Summary Update profil
// @Description Memperbarui profil pengguna terautentikasi dan opsional mengganti password
// @Tags autentikasi
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param payload body dto.UpdateProfileRequest true "Profil payload"
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
