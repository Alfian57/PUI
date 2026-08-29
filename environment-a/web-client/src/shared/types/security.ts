export type SecurityEvent = {
  id: string;
  run_id?: string | null;
  event_type: string;
  source: "api" | "vault_core" | "security_lab" | string;
  severity: "medium" | "high" | "critical" | string;
  outcome: "detected" | "blocked" | "info" | "ok" | "breach" | string;
  user_id?: string | null;
  client_ip?: string | null;
  method?: string;
  path?: string;
  status_code?: number;
  error_code?: string;
  phase?: string;
  step?: string;
  title?: string;
  detail?: string;
  details?: Record<string, unknown>;
  occurred_at: string;
};

export type SecurityEventSummary = {
  status: string;
  range: "24h" | "7d" | "30d";
  generated_at: string;
  total_events: number;
  detected: number;
  blocked: number;
  breaches: number;
  security_lab_runs: number;
  last_event_at?: string | null;
};

export type SecurityEventList = {
  status: string;
  total: number;
  limit: number;
  offset: number;
  security_events: SecurityEvent[];
};
