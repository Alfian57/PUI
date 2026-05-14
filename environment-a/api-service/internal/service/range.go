package service

import (
	"fmt"
	"strings"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
)

func normalizeReportRange(raw string) (string, int, error) {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "", "30d":
		return "30d", 30, nil
	case "7d":
		return "7d", 7, nil
	case "90d":
		return "90d", 90, nil
	default:
		return "", 0, fmt.Errorf("%w: range harus 7d, 30d, atau 90d", domain.ErrInvalidInput)
	}
}
