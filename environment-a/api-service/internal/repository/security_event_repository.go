package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"gorm.io/gorm"
)

type SecurityEventRepository struct {
	db *gorm.DB
}

func NewSecurityEventRepository(db *gorm.DB) *SecurityEventRepository {
	return &SecurityEventRepository{db: db}
}

func (r *SecurityEventRepository) Record(ctx context.Context, input domain.SecurityEventInput) (domain.SecurityEventRecord, error) {
	details, err := json.Marshal(input.Details)
	if err != nil {
		return domain.SecurityEventRecord{}, fmt.Errorf("marshal security event details: %w", err)
	}

	var row struct {
		ID         string
		OccurredAt time.Time
	}
	if err := r.db.WithContext(ctx).Raw(
		`INSERT INTO security_events
			(run_id, event_type, source, severity, outcome, user_id, client_ip, method, path,
			 status_code, error_code, phase, step, title, detail, details, occurred_at)
		 VALUES (NULLIF(?, '')::uuid, ?, ?, ?, ?, NULLIF(?, '')::uuid, NULLIF(?, '')::inet,
			 ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, COALESCE(NULLIF(?, '')::timestamptz, NOW()))
		 RETURNING id::text, occurred_at`,
		input.RunID,
		input.EventType,
		input.Source,
		input.Severity,
		input.Outcome,
		input.UserID,
		input.ClientIP,
		input.Method,
		input.Path,
		input.StatusCode,
		input.ErrorCode,
		input.Phase,
		input.Step,
		input.Title,
		input.Detail,
		string(details),
		formatEventTime(input.OccurredAt),
	).Scan(&row).Error; err != nil {
		return domain.SecurityEventRecord{}, fmt.Errorf("insert security event: %w", err)
	}

	return eventRecordFromInput(input, row.ID, row.OccurredAt), nil
}

func (r *SecurityEventRepository) List(ctx context.Context, filter domain.SecurityEventFilter) ([]domain.SecurityEventRecord, int64, error) {
	where := ` WHERE occurred_at >= ? AND occurred_at < ?`
	args := []any{filter.Since, filter.Until}

	if filter.EventType != "" {
		where += ` AND event_type = ?`
		args = append(args, filter.EventType)
	}
	if filter.Source != "" {
		where += ` AND source = ?`
		args = append(args, filter.Source)
	}
	if filter.Outcome != "" {
		where += ` AND outcome = ?`
		args = append(args, filter.Outcome)
	}
	if filter.RunID != "" {
		where += ` AND run_id = ?::uuid`
		args = append(args, filter.RunID)
	}

	var total int64
	if err := r.db.WithContext(ctx).Raw(`SELECT COUNT(*) FROM security_events`+where, args...).Scan(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count security events: %w", err)
	}

	query := `SELECT id::text, run_id::text, event_type, source, severity, outcome,
		user_id::text, client_ip::text, method, path, status_code, error_code, phase, step,
		title, detail, details::text AS details_json, occurred_at
		FROM security_events` + where + ` ORDER BY occurred_at DESC, id DESC LIMIT ? OFFSET ?`
	listArgs := append(append([]any{}, args...), filter.Limit, filter.Offset)

	var rows []securityEventRow
	if err := r.db.WithContext(ctx).Raw(query, listArgs...).Scan(&rows).Error; err != nil {
		return nil, 0, fmt.Errorf("query security events: %w", err)
	}

	items := make([]domain.SecurityEventRecord, 0, len(rows))
	for _, row := range rows {
		items = append(items, row.toDomain())
	}
	return items, total, nil
}

func (r *SecurityEventRepository) Summary(ctx context.Context, since, until time.Time) (domain.SecurityEventSummary, error) {
	var out domain.SecurityEventSummary
	var row struct {
		TotalEvents     int64
		Detected        int64
		Blocked         int64
		Breaches        int64
		SecurityLabRuns int64
		LastEventAt     *time.Time
	}
	if err := r.db.WithContext(ctx).Raw(
		`SELECT
			COUNT(*) AS total_events,
			COUNT(*) FILTER (WHERE outcome = 'detected') AS detected,
			COUNT(*) FILTER (WHERE outcome = 'blocked') AS blocked,
			COUNT(*) FILTER (WHERE outcome = 'breach') AS breaches,
			COUNT(DISTINCT run_id) FILTER (WHERE event_type = 'SECURITY_LAB_SUMMARY') AS security_lab_runs,
			MAX(occurred_at) AS last_event_at
		 FROM security_events
		 WHERE occurred_at >= ? AND occurred_at < ?`, since, until,
	).Scan(&row).Error; err != nil {
		return out, fmt.Errorf("query security event summary: %w", err)
	}

	out.TotalEvents = row.TotalEvents
	out.Detected = row.Detected
	out.Blocked = row.Blocked
	out.Breaches = row.Breaches
	out.SecurityLabRuns = row.SecurityLabRuns
	out.LastEventAt = row.LastEventAt
	return out, nil
}

func (r *SecurityEventRepository) PurgeBefore(ctx context.Context, before time.Time) (int64, error) {
	result := r.db.WithContext(ctx).Exec(`DELETE FROM security_events WHERE occurred_at < ?`, before)
	if result.Error != nil {
		return 0, fmt.Errorf("purge security events: %w", result.Error)
	}
	return result.RowsAffected, nil
}

type securityEventRow struct {
	ID          string
	RunID       *string
	EventType   string
	Source      string
	Severity    string
	Outcome     string
	UserID      *string
	ClientIP    *string
	Method      string
	Path        string
	StatusCode  int
	ErrorCode   string
	Phase       string
	Step        string
	Title       string
	Detail      string
	DetailsJSON string
	OccurredAt  time.Time
}

func (r securityEventRow) toDomain() domain.SecurityEventRecord {
	details := map[string]any{}
	if r.DetailsJSON != "" {
		_ = json.Unmarshal([]byte(r.DetailsJSON), &details)
	}
	return domain.SecurityEventRecord{
		ID: r.ID, RunID: r.RunID, EventType: r.EventType, Source: r.Source,
		Severity: r.Severity, Outcome: r.Outcome, UserID: r.UserID, ClientIP: r.ClientIP,
		Method: r.Method, Path: r.Path, StatusCode: r.StatusCode, ErrorCode: r.ErrorCode,
		Phase: r.Phase, Step: r.Step, Title: r.Title, Detail: r.Detail, Details: details,
		OccurredAt: r.OccurredAt,
	}
}

func eventRecordFromInput(input domain.SecurityEventInput, id string, occurredAt time.Time) domain.SecurityEventRecord {
	return domain.SecurityEventRecord{
		ID: id, RunID: optionalString(input.RunID), EventType: input.EventType, Source: input.Source,
		Severity: input.Severity, Outcome: input.Outcome, UserID: optionalString(input.UserID),
		ClientIP: optionalString(input.ClientIP), Method: input.Method, Path: input.Path,
		StatusCode: input.StatusCode, ErrorCode: input.ErrorCode, Phase: input.Phase, Step: input.Step,
		Title: input.Title, Detail: input.Detail, Details: input.Details, OccurredAt: occurredAt,
	}
}

func optionalString(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}

func formatEventTime(value time.Time) string {
	if value.IsZero() {
		return ""
	}
	return value.UTC().Format(time.RFC3339Nano)
}
