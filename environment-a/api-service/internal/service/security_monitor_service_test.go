package service

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
)

type fakeSecurityEventRepository struct {
	mu      sync.Mutex
	inputs  []domain.SecurityEventInput
	items   []domain.SecurityEventRecord
	summary domain.SecurityEventSummary
	purged  int64
}

func (f *fakeSecurityEventRepository) Record(_ context.Context, input domain.SecurityEventInput) (domain.SecurityEventRecord, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.inputs = append(f.inputs, input)
	record := domain.SecurityEventRecord{ID: "event-1", EventType: input.EventType, Source: input.Source, Outcome: input.Outcome, Method: input.Method, OccurredAt: input.OccurredAt, Details: input.Details}
	f.items = append(f.items, record)
	return record, nil
}

func (f *fakeSecurityEventRepository) List(_ context.Context, _ domain.SecurityEventFilter) ([]domain.SecurityEventRecord, int64, error) {
	return f.items, int64(len(f.items)), nil
}

func (f *fakeSecurityEventRepository) Summary(_ context.Context, _, _ time.Time) (domain.SecurityEventSummary, error) {
	return f.summary, nil
}

func (f *fakeSecurityEventRepository) PurgeBefore(_ context.Context, _ time.Time) (int64, error) {
	return f.purged, nil
}

func TestSecurityMonitoringRecordPublishesAfterPersistence(t *testing.T) {
	repo := &fakeSecurityEventRepository{}
	service := NewSecurityMonitoringService(repo)
	events, unsubscribe := service.Subscribe()
	defer unsubscribe()

	record, err := service.Record(context.Background(), domain.SecurityEventInput{
		EventType: domain.SecurityEventRateLimitBlocked,
		Source:    domain.SecuritySourceAPI,
		Outcome:   domain.SecurityOutcomeBlocked,
		Severity:  domain.SecuritySeverityHigh,
		Method:    "post",
		Path:      "/api/v1/auth/login",
		Details:   map[string]any{"safe": true},
	})
	if err != nil {
		t.Fatalf("record security event: %v", err)
	}
	if record.ID != "event-1" || record.Method != "POST" {
		t.Fatalf("unexpected normalized record: %+v", record)
	}
	select {
	case published := <-events:
		if published.ID != record.ID || published.Outcome != domain.SecurityOutcomeBlocked {
			t.Fatalf("unexpected published event: %+v", published)
		}
	case <-time.After(time.Second):
		t.Fatal("expected persisted event to be published")
	}
	if len(repo.inputs) != 1 || repo.inputs[0].Details["safe"] != true {
		t.Fatalf("expected repository input to be retained: %+v", repo.inputs)
	}
}

func TestSecurityMonitoringListValidatesPagination(t *testing.T) {
	service := NewSecurityMonitoringService(&fakeSecurityEventRepository{})
	_, _, _, _, err := service.List(context.Background(), domain.SecurityEventFilter{Limit: 101})
	if err == nil {
		t.Fatal("expected oversized limit to fail")
	}
	_, _, _, _, err = service.List(context.Background(), domain.SecurityEventFilter{Offset: -1})
	if err == nil {
		t.Fatal("expected negative offset to fail")
	}
}

func TestNewSecurityRunIDIsUUID(t *testing.T) {
	runID, err := NewSecurityRunID()
	if err != nil {
		t.Fatalf("generate run id: %v", err)
	}
	if !IsUUID(runID) {
		t.Fatalf("expected UUID run id, got %q", runID)
	}
}
