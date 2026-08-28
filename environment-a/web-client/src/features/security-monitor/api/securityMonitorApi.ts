import { http } from "@/shared/api/http";
import type { SecurityEventList, SecurityEventSummary } from "@/shared/types/domain";

export type SecurityMonitorRange = "24h" | "7d" | "30d";

export type SecurityEventFilters = {
  range: SecurityMonitorRange;
  eventType?: string;
  source?: string;
  outcome?: string;
  runID?: string;
  limit?: number;
  offset?: number;
};

function queryString(filters: SecurityEventFilters): string {
  const params = new URLSearchParams();
  params.set("range", filters.range);
  if (filters.eventType) params.set("event_type", filters.eventType);
  if (filters.source) params.set("source", filters.source);
  if (filters.outcome) params.set("outcome", filters.outcome);
  if (filters.runID) params.set("run_id", filters.runID);
  if (filters.limit !== undefined) params.set("limit", String(filters.limit));
  if (filters.offset !== undefined) params.set("offset", String(filters.offset));
  return params.toString();
}

export async function getSecurityEventSummary(range: SecurityMonitorRange): Promise<SecurityEventSummary> {
  const { data } = await http.get<SecurityEventSummary>(`/api/v1/admin/security-monitor/summary?range=${range}`);
  return data;
}

export async function getSecurityEvents(filters: SecurityEventFilters): Promise<SecurityEventList> {
  const { data } = await http.get<SecurityEventList>(`/api/v1/admin/security-monitor/events?${queryString(filters)}`);
  return data;
}
