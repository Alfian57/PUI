package config

import (
	"fmt"
	"path/filepath"

	"github.com/joho/godotenv"
	"github.com/spf13/viper"
)

type Config struct {
	AppEnv                  string
	HTTPAddr                string
	AllowedOrigin           string
	DatabaseURL             string
	VaultUDSPath            string
	VaultChunkRoot          string
	MigrationsPath          string
	MaxUploadSizeBytes      int64
	RateLimitPerMinute      int
	SessionTTLMinutes       int
	SMTPHost                string
	SMTPPort                int
	SMTPUsername            string
	SMTPPassword            string
	SMTPFromEmail           string
	SMTPFromName            string
	PublicWebURL            string
	PasswordResetTTLMinutes int
}

func Load() (Config, error) {
	_ = godotenv.Load()

	viper.AutomaticEnv()
	viper.SetDefault("APP_ENV", "environment-a")
	viper.SetDefault("HTTP_ADDR", ":8080")
	viper.SetDefault("ALLOWED_ORIGIN", "http://localhost:5173")
	viper.SetDefault("VAULT_UDS_PATH", "/var/run/pui/uds/vault-core.sock")
	viper.SetDefault("VAULT_CHUNK_ROOT", "/var/lib/pui/chunks")
	viper.SetDefault("MAX_UPLOAD_SIZE_BYTES", int64(536870912))
	viper.SetDefault("RATE_LIMIT_PER_MINUTE", 120)
	viper.SetDefault("SESSION_TTL_MINUTES", 1440)
	viper.SetDefault("SMTP_PORT", 587)
	viper.SetDefault("SMTP_FROM_NAME", "HashBox")
	viper.SetDefault("PUBLIC_WEB_URL", "http://localhost:5173")
	viper.SetDefault("PASSWORD_RESET_TTL_MINUTES", 30)
	viper.SetDefault("MIGRATIONS_PATH", "db/migrations")

	migrationsPath := filepath.Clean(viper.GetString("MIGRATIONS_PATH"))

	cfg := Config{
		AppEnv:                  viper.GetString("APP_ENV"),
		HTTPAddr:                viper.GetString("HTTP_ADDR"),
		AllowedOrigin:           viper.GetString("ALLOWED_ORIGIN"),
		DatabaseURL:             viper.GetString("DATABASE_URL"),
		VaultUDSPath:            viper.GetString("VAULT_UDS_PATH"),
		VaultChunkRoot:          filepath.Clean(viper.GetString("VAULT_CHUNK_ROOT")),
		MigrationsPath:          migrationsPath,
		MaxUploadSizeBytes:      viper.GetInt64("MAX_UPLOAD_SIZE_BYTES"),
		RateLimitPerMinute:      viper.GetInt("RATE_LIMIT_PER_MINUTE"),
		SessionTTLMinutes:       viper.GetInt("SESSION_TTL_MINUTES"),
		SMTPHost:                viper.GetString("SMTP_HOST"),
		SMTPPort:                viper.GetInt("SMTP_PORT"),
		SMTPUsername:            viper.GetString("SMTP_USERNAME"),
		SMTPPassword:            viper.GetString("SMTP_PASSWORD"),
		SMTPFromEmail:           viper.GetString("SMTP_FROM_EMAIL"),
		SMTPFromName:            viper.GetString("SMTP_FROM_NAME"),
		PublicWebURL:            viper.GetString("PUBLIC_WEB_URL"),
		PasswordResetTTLMinutes: viper.GetInt("PASSWORD_RESET_TTL_MINUTES"),
	}

	if cfg.DatabaseURL == "" {
		return Config{}, fmt.Errorf("DATABASE_URL is required")
	}

	if cfg.MigrationsPath == "" || cfg.MigrationsPath == "." {
		return Config{}, fmt.Errorf("MIGRATIONS_PATH is invalid")
	}

	if cfg.RateLimitPerMinute <= 0 {
		return Config{}, fmt.Errorf("RATE_LIMIT_PER_MINUTE must be positive")
	}

	if cfg.SessionTTLMinutes <= 0 {
		return Config{}, fmt.Errorf("SESSION_TTL_MINUTES must be positive")
	}

	if cfg.SMTPPort <= 0 {
		return Config{}, fmt.Errorf("SMTP_PORT must be positive")
	}

	if cfg.PublicWebURL == "" {
		return Config{}, fmt.Errorf("PUBLIC_WEB_URL is required")
	}

	if cfg.PasswordResetTTLMinutes <= 0 {
		return Config{}, fmt.Errorf("PASSWORD_RESET_TTL_MINUTES must be positive")
	}

	return cfg, nil
}
