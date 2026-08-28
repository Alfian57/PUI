package domain

import "time"

const (
	SecurityEventFailedLogin        = "FAILED_LOGIN"
	SecurityEventUnauthorized       = "UNAUTHORIZED_REQUEST"
	SecurityEventForbidden          = "FORBIDDEN_REQUEST"
	SecurityEventRateLimitBlocked   = "RATE_LIMIT_BLOCKED"
	SecurityEventVaultPolicyBlocked = "VAULT_OPERATION_BLOCKED"
	SecurityEventLabEvent           = "SECURITY_LAB_EVENT"
	SecurityEventLabSummary         = "SECURITY_LAB_SUMMARY"
)

const (
	SecuritySourceAPI         = "api"
	SecuritySourceVault       = "vault_core"
	SecuritySourceSecurityLab = "security_lab"
)

const (
	SecurityOutcomeDetected = "detected"
	SecurityOutcomeBlocked  = "blocked"
	SecurityOutcomeInfo     = "info"
	SecurityOutcomeOK       = "ok"
	SecurityOutcomeBreach   = "breach"
)

const (
	SecuritySeverityMedium   = "medium"
	SecuritySeverityHigh     = "high"
	SecuritySeverityCritical = "critical"
)

// SecurityEventInput is the sanitized, write-side representation of a
// security event. Callers must never put credentials or request bodies in it.
type SecurityEventInput struct {
	RunID      string
	EventType  string
	Source     string
	Severity   string
	Outcome    string
	UserID     string
	ClientIP   string
	Method     string
	Path       string
	StatusCode int
	ErrorCode  string
	Phase      string
	Step       string
	Title      string
	Detail     string
	Details    map[string]any
	OccurredAt time.Time
}

type SecurityEventRecord struct {
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

type SecurityEventFilter struct {
	Since     time.Time
	Until     time.Time
	EventType string
	Source    string
	Outcome   string
	RunID     string
	Limit     int
	Offset    int
}

type SecurityEventSummary struct {
	TotalEvents     int64
	Detected        int64
	Blocked         int64
	Breaches        int64
	SecurityLabRuns int64
	LastEventAt     *time.Time
}
