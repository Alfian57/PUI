package main

import (
	"fmt"
	"log"
	"os"
	"strconv"

	"github.com/alfiang/pui/environment-a/api-service/internal/config"
	"github.com/alfiang/pui/environment-a/api-service/internal/database"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("load api config: %v", err)
	}

	args := os.Args[1:]
	if len(args) == 0 {
		printUsage()
		os.Exit(1)
	}

	command := args[0]

	switch command {
	case "up":
		if err := database.MigrateUp(cfg.DatabaseURL, cfg.MigrationsPath); err != nil {
			log.Fatalf("migrate up: %v", err)
		}
		fmt.Println("migrations up completed")
	case "down":
		steps := 1
		if len(args) > 1 {
			parsed, err := strconv.Atoi(args[1])
			if err != nil || parsed <= 0 {
				log.Fatalf("invalid down steps: %q", args[1])
			}
			steps = parsed
		}

		if err := database.MigrateDownSteps(cfg.DatabaseURL, cfg.MigrationsPath, steps); err != nil {
			log.Fatalf("migrate down: %v", err)
		}
		fmt.Printf("migrations down completed (%d step)\n", steps)
	case "down-all":
		if err := database.MigrateDownAll(cfg.DatabaseURL, cfg.MigrationsPath); err != nil {
			log.Fatalf("migrate down all: %v", err)
		}
		fmt.Println("all migrations rolled back")
	case "fresh":
		if err := database.MigrateDownAll(cfg.DatabaseURL, cfg.MigrationsPath); err != nil {
			log.Fatalf("migrate fresh down-all: %v", err)
		}
		if err := database.MigrateUp(cfg.DatabaseURL, cfg.MigrationsPath); err != nil {
			log.Fatalf("migrate fresh up: %v", err)
		}
		fmt.Println("migrations fresh completed")
	case "version":
		version, dirty, err := database.MigrationVersion(cfg.DatabaseURL, cfg.MigrationsPath)
		if err != nil {
			log.Fatalf("migration version: %v", err)
		}
		fmt.Printf("version=%d dirty=%t\n", version, dirty)
	case "help", "--help", "-h":
		printUsage()
	default:
		printUsage()
		log.Fatalf("unknown migrate command: %s", command)
	}
}

func printUsage() {
	fmt.Println("Usage: go run ./cmd/migrate <command> [args]")
	fmt.Println()
	fmt.Println("Commands:")
	fmt.Println("  up                 Apply all pending migrations")
	fmt.Println("  down [steps]       Roll back migrations (default: 1 step)")
	fmt.Println("  down-all           Roll back all migrations")
	fmt.Println("  fresh              Roll back all migrations then apply all migrations")
	fmt.Println("  version            Show current migration version and dirty status")
}
