// Types mirroring the api-service SecurityLabService JSON contract
// (internal/service/securitylab_service.go).

export type SecurityPhase =
  | "BEFORE"
  | "ATTACK_APP"
  | "PROOF"
  | "ATTACK_UDS"
  | "AFTER";

export type SecurityStatus = "info" | "ok" | "blocked" | "breach";

export type SecurityLabEvent = {
  run_id: string;
  phase: SecurityPhase;
  step: string;
  status: SecurityStatus;
  title: string;
  detail: string;
  data?: Record<string, unknown>;
  timestamp: string;
};

export type SecurityLabSummary = {
  run_id: string;
  manifest_id: string;
  demo_file_name: string;
  file_hash_before: string;
  file_hash_after: string;
  chunk_count_before: number;
  chunk_count_after: number;
  immutable_before: boolean;
  immutable_after: boolean;
  app_layer_compromised: boolean;
  vault_manifest_intact: boolean;
  chunks_verified: number;
  uds_attacks_attempted: number;
  uds_attacks_blocked: number;
  reconstruction_identical: boolean;
  content_hash_before: string;
  content_hash_after: string;
  passed: boolean;
};

export const PHASE_LABELS: Record<SecurityPhase, string> = {
  BEFORE: "Fase 0 — Rekam State Awal",
  ATTACK_APP: "Fase 1 — Serangan Lapisan Aplikasi",
  PROOF: "Fase 2 — Bukti Vault Core Utuh",
  ATTACK_UDS: "Fase 3 — Serangan Langsung ke Vault Core (UDS)",
  AFTER: "Fase 4 — Rekonstruksi & Verifikasi"
};

export const PHASE_ORDER: SecurityPhase[] = [
  "BEFORE",
  "ATTACK_APP",
  "PROOF",
  "ATTACK_UDS",
  "AFTER"
];
