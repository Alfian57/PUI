package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	AppName               string
	AppEnv                string
	UDSPath               string
	SecurityEventsUDSPath string
	BadgerPath            string
	ChunkRoot             string
	UDSOwnerUID           int
	UDSOwnerGID           int
	UDSAllowedUIDs        []uint32
	FastCDCMinChunkSize   int
	FastCDCAvgChunkSize   int
	FastCDCMaxChunkSize   int
	// StrictDownloadVerify enables full verify-before-send for objects ≤ StrictVerifyMaxBytes.
	// Larger objects fall back to streaming with pre-flight existence check.
	StrictDownloadVerify bool
	StrictVerifyMaxBytes int64
}

func Load() (Config, error) {
	defaults := defaults()

	minChunkSize, err := intFromEnv("FASTCDC_MIN_CHUNK_SIZE", defaults.FastCDCMinChunkSize)
	if err != nil {
		return Config{}, err
	}

	avgChunkSize, err := intFromEnv("FASTCDC_AVG_CHUNK_SIZE", defaults.FastCDCAvgChunkSize)
	if err != nil {
		return Config{}, err
	}

	maxChunkSize, err := intFromEnv("FASTCDC_MAX_CHUNK_SIZE", defaults.FastCDCMaxChunkSize)
	if err != nil {
		return Config{}, err
	}

	udsOwnerUID, err := intFromEnv("UDS_OWNER_UID", defaults.UDSOwnerUID)
	if err != nil {
		return Config{}, err
	}

	udsOwnerGID, err := intFromEnv("UDS_OWNER_GID", defaults.UDSOwnerGID)
	if err != nil {
		return Config{}, err
	}

	udsAllowedUIDs, err := uint32ListFromEnv("UDS_ALLOWED_UIDS", defaults.UDSAllowedUIDs)
	if err != nil {
		return Config{}, err
	}

	cfg := Config{
		AppName:               stringFromEnv("APP_NAME", defaults.AppName),
		AppEnv:                stringFromEnv("APP_ENV", defaults.AppEnv),
		UDSPath:               stringFromEnv("UDS_PATH", defaults.UDSPath),
		SecurityEventsUDSPath: stringFromEnv("SECURITY_EVENTS_UDS_PATH", defaults.SecurityEventsUDSPath),
		BadgerPath:            stringFromEnv("BADGER_PATH", defaults.BadgerPath),
		ChunkRoot:             stringFromEnv("CHUNK_ROOT", defaults.ChunkRoot),
		UDSOwnerUID:           udsOwnerUID,
		UDSOwnerGID:           udsOwnerGID,
		UDSAllowedUIDs:        udsAllowedUIDs,
		FastCDCMinChunkSize:   minChunkSize,
		FastCDCAvgChunkSize:   avgChunkSize,
		FastCDCMaxChunkSize:   maxChunkSize,
		StrictDownloadVerify:  boolFromEnv("STRICT_DOWNLOAD_VERIFY", defaults.StrictDownloadVerify),
		StrictVerifyMaxBytes:  int64FromEnv("STRICT_VERIFY_MAX_BYTES", defaults.StrictVerifyMaxBytes),
	}

	if cfg.FastCDCMinChunkSize <= 0 || cfg.FastCDCAvgChunkSize <= 0 || cfg.FastCDCMaxChunkSize <= 0 {
		return Config{}, fmt.Errorf("FASTCDC chunk sizes must be positive")
	}

	if cfg.UDSOwnerUID < 0 || cfg.UDSOwnerGID < 0 {
		return Config{}, fmt.Errorf("UDS owner uid/gid must be >= 0")
	}

	return cfg, nil
}

func stringFromEnv(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}

	return value
}

func intFromEnv(key string, fallback int) (int, error) {
	value := os.Getenv(key)
	if value == "" {
		return fallback, nil
	}

	parsed, err := strconv.Atoi(value)
	if err != nil {
		return 0, fmt.Errorf("%s must be integer: %w", key, err)
	}

	return parsed, nil
}

func uint32ListFromEnv(key string, fallback []uint32) ([]uint32, error) {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		copied := make([]uint32, len(fallback))
		copy(copied, fallback)
		return copied, nil
	}

	parts := strings.Split(raw, ",")
	result := make([]uint32, 0, len(parts))
	for _, part := range parts {
		value := strings.TrimSpace(part)
		if value == "" {
			continue
		}

		parsed, err := strconv.ParseUint(value, 10, 32)
		if err != nil {
			return nil, fmt.Errorf("%s must contain comma-separated uint32 values: %w", key, err)
		}

		result = append(result, uint32(parsed))
	}

	if len(result) == 0 {
		return nil, fmt.Errorf("%s must not be empty", key)
	}

	return result, nil
}

func boolFromEnv(key string, fallback bool) bool {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func int64FromEnv(key string, fallback int64) int64 {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseInt(value, 10, 64)
	if err != nil {
		return fallback
	}
	return parsed
}
