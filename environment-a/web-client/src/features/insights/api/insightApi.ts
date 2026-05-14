import { http } from "@/shared/api/http";
import type { UserInsight } from "@/shared/types/domain";

export type InsightRange = "7d" | "30d" | "90d";

export async function getUserInsight(range: InsightRange): Promise<UserInsight> {
  const { data } = await http.get<UserInsight>(`/api/v1/insights?range=${range}`);
  return data;
}
