package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
)

const (
	defaultSecurityEventLimit = 25
	maxSecurityEventLimit     = 100
	securityEventRetention    = 30 * 24 * time.Hour
	maxSecurityDetailBytes    = 16 * 1024
)

type securityEventRepository interface {
	Record(context.Context, domain.SecurityEventInput) (domain.SecurityEventRecord, error)
	List(context.Context, domain.SecurityEventFilter) ([]domain.SecurityEventRecord, int64, error)
	Summary(context.Context, time.Time, time.Time) (domain.SecurityEventSummary, error)
	PurgeBefore(context.Context, time.Time) (int64, error)
}

// SecurityEventSubscriber is implemented by the live SSE endpoint.
type SecurityEventSubscriber interface {
	Subscribe() (<-chan domain.SecurityEventRecord, func())
}

// SecurityMonitoringService is the single write path for security events. An
// event is published only after it has been persisted successfully.
type SecurityMonitoringService struct {
	repo      securityEventRepository
	broadcast *securityEventBroadcaster
}

func NewSecurityMonitoringService(repo securityEventRepository) *SecurityMonitoringService {
	return &SecurityMonitoringService{
		repo:      repo,
		broadcast: newSecurityEventBroadcaster(),
	}
}

func (s *SecurityMonitoringService) Record(ctx context.Context, input domain.SecurityEventInput) (domain.SecurityEventRecord, error) {
	input = normalizeSecurityEvent(input)
	record, err := s.repo.Record(ctx, input)
	if err != nil {
		return domain.SecurityEventRecord{}, err
	}
	s.broadcast.Publish(record)
	return record, nil
}

func (s *SecurityMonitoringService) List(ctx context.Context, filter domain.SecurityEventFilter) ([]domain.SecurityEventRecord, int64, int, int, error) {
	if filter.Limit == 0 {
		filter.Limit = defaultSecurityEventLimit
	}
	if filter.Limit < 1 || filter.Limit > maxSecurityEventLimit {
		return nil, 0, 0, 0, fmt.Errorf("%w: limit harus antara 1 dan %d", domain.ErrInvalidInput, maxSecurityEventLimit)
	}
	if filter.Offset < 0 {
		return nil, 0, 0, 0, fmt.Errorf("%w: offset tidak boleh negatif", domain.ErrInvalidInput)
	}
	if filter.EventType != "" && len(filter.EventType) > 60 {
		return nil, 0, 0, 0, fmt.Errorf("%w: event_type terlalu panjang", domain.ErrInvalidInput)
	}
	if filter.Source != "" && len(filter.Source) > 30 {
		return nil, 0, 0, 0, fmt.Errorf("%w: source terlalu panjang", domain.ErrInvalidInput)
	}
	if filter.Outcome != "" && len(filter.Outcome) > 20 {
		return nil, 0, 0, 0, fmt.Errorf("%w: outcome terlalu panjang", domain.ErrInvalidInput)
	}

	items, total, err := s.repo.List(ctx, filter)
	if err != nil {
		return nil, 0, 0, 0, err
	}
	return items, total, filter.Limit, filter.Offset, nil
}

func (s *SecurityMonitoringService) Summary(ctx context.Context, since, until time.Time) (domain.SecurityEventSummary, error) {
	return s.repo.Summary(ctx, since, until)
}

func (s *SecurityMonitoringService) Subscribe() (<-chan domain.SecurityEventRecord, func()) {
	return s.broadcast.Subscribe()
}

func (s *SecurityMonitoringService) PurgeExpired(ctx context.Context) (int64, error) {
	return s.repo.PurgeBefore(ctx, time.Now().UTC().Add(-securityEventRetention))
}

func (s *SecurityMonitoringService) Close() {
	s.broadcast.Close()
}

func NewSecurityRunID() (string, error) {
	value := make([]byte, 16)
	if _, err := rand.Read(value); err != nil {
		return "", fmt.Errorf("generate security run id: %w", err)
	}
	value[6] = (value[6] & 0x0f) | 0x40
	value[8] = (value[8] & 0x3f) | 0x80
	encoded := hex.EncodeToString(value)
	return encoded[0:8] + "-" + encoded[8:12] + "-" + encoded[12:16] + "-" + encoded[16:20] + "-" + encoded[20:32], nil
}

func normalizeSecurityEvent(input domain.SecurityEventInput) domain.SecurityEventInput {
	input.EventType = truncateSecurityString(strings.TrimSpace(input.EventType), 60)
	input.Source = truncateSecurityString(strings.TrimSpace(input.Source), 30)
	input.Severity = truncateSecurityString(strings.TrimSpace(input.Severity), 20)
	input.Outcome = truncateSecurityString(strings.TrimSpace(input.Outcome), 20)
	input.RunID = validOptionalUUID(input.RunID)
	input.UserID = validOptionalUUID(input.UserID)
	input.ClientIP = truncateSecurityString(strings.TrimSpace(input.ClientIP), 64)
	input.Method = truncateSecurityString(strings.ToUpper(strings.TrimSpace(input.Method)), 10)
	input.Path = truncateSecurityString(strings.TrimSpace(input.Path), 255)
	input.ErrorCode = truncateSecurityString(strings.TrimSpace(input.ErrorCode), 100)
	input.Phase = truncateSecurityString(strings.TrimSpace(input.Phase), 30)
	input.Step = truncateSecurityString(strings.TrimSpace(input.Step), 100)
	input.Title = truncateSecurityString(strings.TrimSpace(input.Title), 255)
	input.Detail = truncateSecurityString(strings.TrimSpace(input.Detail), 4000)
	if input.EventType == "" {
		input.EventType = "SECURITY_EVENT"
	}
	if input.Source == "" {
		input.Source = domain.SecuritySourceAPI
	}
	if input.Severity == "" {
		input.Severity = domain.SecuritySeverityMedium
	}
	if input.Outcome == "" {
		input.Outcome = domain.SecurityOutcomeDetected
	}
	if input.Details == nil {
		input.Details = map[string]any{}
	} else if encoded, err := json.Marshal(input.Details); err != nil || len(encoded) > maxSecurityDetailBytes {
		input.Details = map[string]any{"details_truncated": true}
	}
	if input.OccurredAt.IsZero() {
		input.OccurredAt = time.Now().UTC()
	} else {
		input.OccurredAt = input.OccurredAt.UTC()
	}
	return input
}

func validOptionalUUID(value string) string {
	value = strings.TrimSpace(value)
	if value == "" || !IsUUID(value) {
		return ""
	}
	return value
}

func truncateSecurityString(value string, max int) string {
	if len(value) <= max {
		return value
	}
	return value[:max]
}

type securityEventBroadcaster struct {
	mu          sync.Mutex
	nextID      uint64
	subscribers map[uint64]chan domain.SecurityEventRecord
	closed      bool
}

func newSecurityEventBroadcaster() *securityEventBroadcaster {
	return &securityEventBroadcaster{subscribers: make(map[uint64]chan domain.SecurityEventRecord)}
}

func (b *securityEventBroadcaster) Subscribe() (<-chan domain.SecurityEventRecord, func()) {
	b.mu.Lock()
	defer b.mu.Unlock()
	channel := make(chan domain.SecurityEventRecord, 64)
	if b.closed {
		close(channel)
		return channel, func() {}
	}
	id := atomic.AddUint64(&b.nextID, 1)
	b.subscribers[id] = channel
	var once sync.Once
	return channel, func() {
		once.Do(func() {
			b.mu.Lock()
			defer b.mu.Unlock()
			if current, ok := b.subscribers[id]; ok {
				delete(b.subscribers, id)
				close(current)
			}
		})
	}
}

func (b *securityEventBroadcaster) Publish(event domain.SecurityEventRecord) {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.closed {
		return
	}
	for _, channel := range b.subscribers {
		select {
		case channel <- event:
		default:
			// History is durable; a slow live client may drop an old live event
			// but can recover it by refetching the history endpoint.
			select {
			case <-channel:
			default:
			}
			select {
			case channel <- event:
			default:
			}
		}
	}
}

func (b *securityEventBroadcaster) Close() {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.closed {
		return
	}
	b.closed = true
	for id, channel := range b.subscribers {
		close(channel)
		delete(b.subscribers, id)
	}
}

func recordSecurityEventError(err error) {
	if err != nil {
		log.Printf("event=security_event_record_failed err=%v", err)
	}
}
