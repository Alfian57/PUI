package dto

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type UserDTO struct {
	ID       string `json:"id"`
	FullName string `json:"full_name"`
	Email    string `json:"email"`
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
