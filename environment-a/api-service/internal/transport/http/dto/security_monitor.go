package dto

import "time"

type SecurityEventDTO struct {
	ID         string         `json:"id"`
	RunID      *string        `json:"run_id,omitempty"`
	EventType  string         `json:"event_type"`
	Source     string         `json:"source"`
	Severity   string         `json:"severity"`
	Outcome    string         `json:"outcome"`
	UserID     *string        `json:"user_id,omitempty"`
	ClientIP   *string        `json:"client_ip,omitempty"`
	Method     string         `json:"method,omitempty"`
	Path       string         `json:"path,omitempty"`
	StatusCode int            `json:"status_code,omitempty"`
	ErrorCode  string         `json:"error_code,omitempty"`
	Phase      string         `json:"phase,omitempty"`
	Step       string         `json:"step,omitempty"`
	Title      string         `json:"title,omitempty"`
	Detail     string         `json:"detail,omitempty"`
	Details    map[string]any `json:"details,omitempty"`
	OccurredAt time.Time      `json:"occurred_at"`
}

type SecurityEventListResponse struct {
	Status         string             `json:"status"`
	Total          int64              `json:"total"`
	Limit          int                `json:"limit"`
	Offset         int                `json:"offset"`
	SecurityEvents []SecurityEventDTO `json:"security_events"`
}

type SecurityEventSummaryResponse struct {
	Status          string     `json:"status"`
	Range           string     `json:"range"`
	GeneratedAt     string     `json:"generated_at"`
	TotalEvents     int64      `json:"total_events"`
	Detected        int64      `json:"detected"`
	Blocked         int64      `json:"blocked"`
	Breaches        int64      `json:"breaches"`
	SecurityLabRuns int64      `json:"security_lab_runs"`
	LastEventAt     *time.Time `json:"last_event_at,omitempty"`
}
