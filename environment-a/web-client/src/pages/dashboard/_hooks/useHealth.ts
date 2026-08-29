import { useQuery } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import { queryKeys } from "@/shared/lib/queryKeys";
import type { HealthState } from "@/shared/types/health";

async function getHealth(): Promise<HealthState> {
  const { data } = await http.get<HealthState>("/api/v1/health");
  return data;
}

export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: getHealth,
    refetchInterval: 30000
  });
}
