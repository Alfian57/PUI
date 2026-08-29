import { http } from "@/shared/api/http";
import type { AdminAnalytics, AdminSystemStatus } from "@/shared/types/admin";

export type AdminAnalyticsRange = "7d" | "30d" | "90d";

export async function getAdminAnalytics(range: AdminAnalyticsRange): Promise<AdminAnalytics> {
  const { data } = await http.get<AdminAnalytics>(`/api/v1/admin/analytics?range=${range}`);
  return data;
}

export async function getAdminSystemStatus(): Promise<AdminSystemStatus> {
  const { data } = await http.get<AdminSystemStatus>("/api/v1/admin/system");
  return data;
}
