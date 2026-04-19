package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	AppEnv              string
	UDSPath             string
	BadgerPath          string
	ChunkRoot           string
	UDSOwnerUID         int
	UDSOwnerGID         int
	UDSAllowedUIDs      []uint32
	FastCDCMinChunkSize int
	FastCDCAvgChunkSize int
	FastCDCMaxChunkSize int
}

func Load() (Config, error) {
	minChunkSize, err := intFromEnv("FASTCDC_MIN_CHUNK_SIZE", 65536)
	if err != nil {
		return Config{}, err
	}

	avgChunkSize, err := intFromEnv("FASTCDC_AVG_CHUNK_SIZE", 262144)
	if err != nil {
		return Config{}, err
	}

	maxChunkSize, err := intFromEnv("FASTCDC_MAX_CHUNK_SIZE", 1048576)
	if err != nil {
		return Config{}, err
	}

	udsOwnerUID, err := intFromEnv("UDS_OWNER_UID", 10002)
	if err != nil {
		return Config{}, err
	}

	udsOwnerGID, err := intFromEnv("UDS_OWNER_GID", 20000)
	if err != nil {
		return Config{}, err
	}

	udsAllowedUIDs, err := uint32ListFromEnv("UDS_ALLOWED_UIDS", []uint32{10001})
	if err != nil {
		return Config{}, err
	}

	cfg := Config{
		AppEnv:              stringFromEnv("APP_ENV", "environment-b"),
		UDSPath:             stringFromEnv("UDS_PATH", "/var/run/pui/uds/vault-core.sock"),
		BadgerPath:          stringFromEnv("BADGER_PATH", "/var/lib/pui/badger"),
		ChunkRoot:           stringFromEnv("CHUNK_ROOT", "/var/lib/pui/chunks"),
		UDSOwnerUID:         udsOwnerUID,
		UDSOwnerGID:         udsOwnerGID,
		UDSAllowedUIDs:      udsAllowedUIDs,
		FastCDCMinChunkSize: minChunkSize,
		FastCDCAvgChunkSize: avgChunkSize,
		FastCDCMaxChunkSize: maxChunkSize,
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
