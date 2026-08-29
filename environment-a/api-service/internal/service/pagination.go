package service

import (
	"fmt"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
)

const (
	defaultListLimit = 40
	maxListLimit     = 200
)

func normalizePagination(limit, offset int) (int, int, error) {
	if limit == 0 {
		limit = defaultListLimit
	}
	if limit < 1 || limit > maxListLimit {
		return 0, 0, fmt.Errorf("%w: limit harus antara 1 dan %d", domain.ErrInvalidInput, maxListLimit)
	}
	if offset < 0 {
		return 0, 0, fmt.Errorf("%w: offset tidak boleh negatif", domain.ErrInvalidInput)
	}

	return limit, offset, nil
}
