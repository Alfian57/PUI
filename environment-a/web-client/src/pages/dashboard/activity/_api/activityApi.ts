import { http } from "@/shared/api/http";
import type { ActivityLog } from "@/pages/dashboard/activity/_types/activity";

export const ACTIVITY_PAGE_SIZE = 15;

export type ActivityLogResponse = {
    activity_logs: ActivityLog[];
    total: number;
};

export async function fetchActivityLogs(page: number): Promise<ActivityLogResponse> {
    const offset = page * ACTIVITY_PAGE_SIZE;
    const { data } = await http.get<ActivityLogResponse>(
        "/api/v1/activity-logs?limit=" + ACTIVITY_PAGE_SIZE + "&offset=" + offset
    );
    return data;
}
