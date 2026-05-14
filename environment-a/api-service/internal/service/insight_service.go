package service

import (
	"context"
	"time"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"github.com/alfiang/pui/environment-a/api-service/internal/repository"
)

type InsightService struct {
	insightRepo *repository.InsightRepository
}

func NewInsightService(insightRepo *repository.InsightRepository) *InsightService {
	return &InsightService{insightRepo: insightRepo}
}

func (s *InsightService) UserInsight(ctx context.Context, user domain.AuthUser, rawRange string) (domain.UserInsight, error) {
	if user.Role != "user" {
		return domain.UserInsight{}, domain.ErrForbidden
	}

	label, days, err := normalizeReportRange(rawRange)
	if err != nil {
		return domain.UserInsight{}, err
	}

	since := time.Now().UTC().AddDate(0, 0, -days+1)
	insight, err := s.insightRepo.UserInsight(ctx, user.UserID, since)
	if err != nil {
		return domain.UserInsight{}, err
	}

	insight.Range = label
	insight.GeneratedAt = time.Now().UTC()
	return insight, nil
}
