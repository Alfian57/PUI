package database

import (
	"errors"
	"fmt"
	"path/filepath"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

func RunMigrations(databaseURL, migrationsPath string) error {
	return MigrateUp(databaseURL, migrationsPath)
}

func MigrateUp(databaseURL, migrationsPath string) error {
	m, err := newMigrator(databaseURL, migrationsPath)
	if err != nil {
		return err
	}
	defer closeMigrator(m)

	if err := m.Up(); err != nil {
		if errors.Is(err, migrate.ErrNoChange) {
			return nil
		}

		return fmt.Errorf("run migrations up: %w", err)
	}

	return nil
}

func MigrateDownSteps(databaseURL, migrationsPath string, steps int) error {
	if steps <= 0 {
		return fmt.Errorf("steps must be positive")
	}

	m, err := newMigrator(databaseURL, migrationsPath)
	if err != nil {
		return err
	}
	defer closeMigrator(m)

	if err := m.Steps(-steps); err != nil {
		if errors.Is(err, migrate.ErrNoChange) {
			return nil
		}

		return fmt.Errorf("run migrations down %d step(s): %w", steps, err)
	}

	return nil
}

func MigrateDownAll(databaseURL, migrationsPath string) error {
	m, err := newMigrator(databaseURL, migrationsPath)
	if err != nil {
		return err
	}
	defer closeMigrator(m)

	if err := m.Down(); err != nil {
		if errors.Is(err, migrate.ErrNoChange) {
			return nil
		}

		return fmt.Errorf("run migrations down all: %w", err)
	}

	return nil
}

func MigrationVersion(databaseURL, migrationsPath string) (uint, bool, error) {
	m, err := newMigrator(databaseURL, migrationsPath)
	if err != nil {
		return 0, false, err
	}
	defer closeMigrator(m)

	version, dirty, err := m.Version()
	if err != nil {
		if errors.Is(err, migrate.ErrNilVersion) {
			return 0, false, nil
		}

		return 0, false, fmt.Errorf("read migration version: %w", err)
	}

	return version, dirty, nil
}

func newMigrator(databaseURL, migrationsPath string) (*migrate.Migrate, error) {
	absolutePath, err := filepath.Abs(migrationsPath)
	if err != nil {
		return nil, fmt.Errorf("resolve migrations path: %w", err)
	}

	m, err := migrate.New("file://"+absolutePath, databaseURL)
	if err != nil {
		return nil, fmt.Errorf("create migrator: %w", err)
	}

	return m, nil
}

func closeMigrator(m *migrate.Migrate) {
	_, _ = m.Close()
}
