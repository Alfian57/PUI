package dto

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type RegisterRequest struct {
	FullName        string `json:"full_name" validate:"required,min=2,max=150"`
	Email           string `json:"email" validate:"required,email"`
	Password        string `json:"password" validate:"required,min=8"`
	ConfirmPassword string `json:"confirm_password" validate:"required"`
}

type UpdateProfileRequest struct {
	FullName        string `json:"full_name" validate:"required,min=2,max=150"`
	Email           string `json:"email" validate:"required,email"`
	CurrentPassword string `json:"current_password,omitempty"`
	NewPassword     string `json:"new_password,omitempty" validate:"omitempty,min=8"`
}

type UserDTO struct {
	ID       string `json:"id"`
	FullName string `json:"full_name"`
	Email    string `json:"email"`
	Role     string `json:"role"`
}

type LoginResponse struct {
	Status      string  `json:"status"`
	AccessToken string  `json:"access_token"`
	ExpiresAt   string  `json:"expires_at"`
	User        UserDTO `json:"user"`
}

type MeResponse struct {
	Status string  `json:"status"`
	User   UserDTO `json:"user"`
}
