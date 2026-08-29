import { useQuery } from "@tanstack/react-query";
import { getAdminSystemStatus } from "@/pages/dashboard/admin/_api/adminApi";
import { queryKeys } from "@/shared/lib/queryKeys";

export function useAdminSystemStatus() {
    const systemQuery = useQuery({
        queryKey: queryKeys.admin.system,
        queryFn: getAdminSystemStatus
    });

    return {
        systemQuery,
        system: systemQuery.data
    };
}
