package config

import (
	"fmt"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/spf13/viper"
)

type Config struct {
	AppName                   string
	AppEnv                    string
	HTTPAddr                  string
	AllowedOrigin             string
	TrustedProxies            []string // comma-separated CIDRs/IPs; empty = trust nobody
	DatabaseURL               string
	VaultUDSPath              string
	MigrationsPath            string
	MaxUploadSizeBytes        int64
	RateLimitPerMinute        int
	SessionTTLMinutes         int
	SMTPHost                  string
	SMTPPort                  int
	SMTPUsername              string
	SMTPPassword              string
	SMTPFromEmail             string
	SMTPFromName              string
	PublicWebURL              string
	PasswordResetTTLMinutes   int
	SecurityLabEnabled        bool
	SecurityEventsUDSPath     string
	SecurityEventsAllowedUIDs []uint32
}

func Load() (Config, error) {
	defaults := defaults()
	viper.AutomaticEnv()
	viper.SetDefault("APP_NAME", defaults.AppName)
	viper.SetDefault("APP_ENV", defaults.AppEnv)
	viper.SetDefault("HTTP_ADDR", defaults.HTTPAddr)
	viper.SetDefault("ALLOWED_ORIGIN", defaults.AllowedOrigin)
	viper.SetDefault("VAULT_UDS_PATH", defaults.VaultUDSPath)
	viper.SetDefault("MAX_UPLOAD_SIZE_BYTES", defaults.MaxUploadSizeBytes)
	viper.SetDefault("RATE_LIMIT_PER_MINUTE", defaults.RateLimitPerMinute)
	viper.SetDefault("SESSION_TTL_MINUTES", defaults.SessionTTLMinutes)
	viper.SetDefault("SMTP_PORT", defaults.SMTPPort)
	viper.SetDefault("SMTP_FROM_NAME", defaults.SMTPFromName)
	viper.SetDefault("PUBLIC_WEB_URL", defaults.PublicWebURL)
	viper.SetDefault("PASSWORD_RESET_TTL_MINUTES", defaults.PasswordResetTTLMinutes)
	viper.SetDefault("MIGRATIONS_PATH", defaults.MigrationsPath)
	viper.SetDefault("TRUSTED_PROXIES", defaults.TrustedProxies)
	// Security Lab (ransomware-mitigation demo) is OFF by default. It must only be
	// enabled in the demo/skripsi environment because it performs real uploads and
	// permanent deletions on the calling user's account.
	viper.SetDefault("SECURITY_LAB_ENABLED", defaults.SecurityLabEnabled)
	viper.SetDefault("SECURITY_EVENTS_UDS_PATH", defaults.SecurityEventsUDSPath)
	viper.SetDefault("SECURITY_EVENTS_ALLOWED_UIDS", defaults.SecurityEventsAllowedUIDs)

	migrationsPath := filepath.Clean(viper.GetString("MIGRATIONS_PATH"))

	var trustedProxies []string
	if raw := strings.TrimSpace(viper.GetString("TRUSTED_PROXIES")); raw != "" {
		for _, p := range strings.Split(raw, ",") {
			if p = strings.TrimSpace(p); p != "" {
				trustedProxies = append(trustedProxies, p)
			}
		}
	}

	securityEventUIDs, err := uint32ListFromString(viper.GetString("SECURITY_EVENTS_ALLOWED_UIDS"))
	if err != nil {
		return Config{}, err
	}

	cfg := Config{
		AppName:                   viper.GetString("APP_NAME"),
		AppEnv:                    viper.GetString("APP_ENV"),
		HTTPAddr:                  viper.GetString("HTTP_ADDR"),
		AllowedOrigin:             viper.GetString("ALLOWED_ORIGIN"),
		TrustedProxies:            trustedProxies,
		DatabaseURL:               viper.GetString("DATABASE_URL"),
		VaultUDSPath:              viper.GetString("VAULT_UDS_PATH"),
		MigrationsPath:            migrationsPath,
		MaxUploadSizeBytes:        viper.GetInt64("MAX_UPLOAD_SIZE_BYTES"),
		RateLimitPerMinute:        viper.GetInt("RATE_LIMIT_PER_MINUTE"),
		SessionTTLMinutes:         viper.GetInt("SESSION_TTL_MINUTES"),
		SMTPHost:                  viper.GetString("SMTP_HOST"),
		SMTPPort:                  viper.GetInt("SMTP_PORT"),
		SMTPUsername:              viper.GetString("SMTP_USERNAME"),
		SMTPPassword:              viper.GetString("SMTP_PASSWORD"),
		SMTPFromEmail:             viper.GetString("SMTP_FROM_EMAIL"),
		SMTPFromName:              viper.GetString("SMTP_FROM_NAME"),
		PublicWebURL:              viper.GetString("PUBLIC_WEB_URL"),
		PasswordResetTTLMinutes:   viper.GetInt("PASSWORD_RESET_TTL_MINUTES"),
		SecurityLabEnabled:        viper.GetBool("SECURITY_LAB_ENABLED"),
		SecurityEventsUDSPath:     viper.GetString("SECURITY_EVENTS_UDS_PATH"),
		SecurityEventsAllowedUIDs: securityEventUIDs,
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

func uint32ListFromString(raw string) ([]uint32, error) {
	parts := strings.Split(strings.TrimSpace(raw), ",")
	values := make([]uint32, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		parsed, err := strconv.ParseUint(part, 10, 32)
		if err != nil {
			return nil, fmt.Errorf("SECURITY_EVENTS_ALLOWED_UIDS must contain comma-separated uint32 values: %w", err)
		}
		values = append(values, uint32(parsed))
	}
	if len(values) == 0 {
		return nil, fmt.Errorf("SECURITY_EVENTS_ALLOWED_UIDS must not be empty")
	}
	return values, nil
}
