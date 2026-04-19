package service

import (
	"context"
	"database/sql"
	"time"
)

type HealthStatus struct {
	Status      string    `json:"status"`
	Database    string    `json:"database"`
	VaultCore   string    `json:"vault_core"`
	CheckedAt   time.Time `json:"timestamp"`
	Environment string    `json:"environment"`
}

type VaultHealthClient interface {
	Health(ctx context.Context) (map[string]any, error)
}

type SystemService struct {
	db          *sql.DB
	vault       VaultHealthClient
	environment string
}

func NewSystemService(db *sql.DB, vault VaultHealthClient, environment string) *SystemService {
	return &SystemService{db: db, vault: vault, environment: environment}
}

func (s *SystemService) Health() map[string]any {
	return map[string]any{
		"status":      "ok",
		"environment": s.environment,
	}
}

func (s *SystemService) Status(ctx context.Context) HealthStatus {
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	dbStatus := "ok"
	if err := s.db.PingContext(ctx); err != nil {
		dbStatus = "error"
	}

	vaultStatus := "ok"
	if _, err := s.vault.Health(ctx); err != nil {
		vaultStatus = "error"
	}

	status := "ok"
	if dbStatus != "ok" || vaultStatus != "ok" {
		status = "degraded"
	}

	return HealthStatus{
		Status:    status,
		Database:  dbStatus,
		VaultCore: vaultStatus,
		CheckedAt: time.Now().UTC(),
	}
}
