package service

import (
	"context"
	"time"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"github.com/alfiang/pui/environment-a/api-service/internal/repository"
)

type AdminService struct {
	adminRepo *repository.AdminRepository
}

func NewAdminService(adminRepo *repository.AdminRepository) *AdminService {
	return &AdminService{adminRepo: adminRepo}
}

func (s *AdminService) Analytics(ctx context.Context, user domain.AuthUser, rawRange string) (domain.AdminAnalytics, error) {
	if user.Role != "admin" {
		return domain.AdminAnalytics{}, domain.ErrForbidden
	}

	label, days, err := normalizeReportRange(rawRange)
	if err != nil {
		return domain.AdminAnalytics{}, err
	}

	since := time.Now().UTC().AddDate(0, 0, -days+1)
	analytics, err := s.adminRepo.Analytics(ctx, since)
	if err != nil {
		return domain.AdminAnalytics{}, err
	}

	analytics.Range = label
	analytics.GeneratedAt = time.Now().UTC()
	return analytics, nil
}
