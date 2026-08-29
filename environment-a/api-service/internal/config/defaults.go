package config

import (
	"os"
	"strconv"
)

const applicationName = "HashBox PUI"

type defaultValues struct {
	AppName                   string
	AppEnv                    string
	HTTPAddr                  string
	AllowedOrigin             string
	VaultUDSPath              string
	MaxUploadSizeBytes        int64
	RateLimitPerMinute        int
	SessionTTLMinutes         int
	SMTPPort                  int
	SMTPFromName              string
	PublicWebURL              string
	PasswordResetTTLMinutes   int
	MigrationsPath            string
	TrustedProxies            string
	SecurityLabEnabled        bool
	SecurityEventsUDSPath     string
	SecurityEventsAllowedUIDs string
}

func defaults() defaultValues {
	uid := strconv.Itoa(os.Getuid())

	return defaultValues{
		AppName:                   applicationName,
		AppEnv:                    "environment-a",
		HTTPAddr:                  ":8080",
		AllowedOrigin:             "http://localhost:5173",
		VaultUDSPath:              "../../data/uds/vault-core.sock",
		MaxUploadSizeBytes:        536870912,
		RateLimitPerMinute:        120,
		SessionTTLMinutes:         1440,
		SMTPPort:                  587,
		SMTPFromName:              "HashBox",
		PublicWebURL:              "http://localhost:5173",
		PasswordResetTTLMinutes:   30,
		MigrationsPath:            "db/migrations",
		TrustedProxies:            "",
		SecurityLabEnabled:        false,
		SecurityEventsUDSPath:     "../../data/uds/api/security-events.sock",
		SecurityEventsAllowedUIDs: uid,
	}
}
