package domain

import "time"

type AuthUser struct {
	SessionID string `json:"session_id"`
	UserID    string `json:"id"`
	FullName  string `json:"full_name"`
	Email     string `json:"email"`
}

type LoginResult struct {
	AccessToken string    `json:"access_token"`
	ExpiresAt   time.Time `json:"expires_at"`
	User        AuthUser  `json:"user"`
}
