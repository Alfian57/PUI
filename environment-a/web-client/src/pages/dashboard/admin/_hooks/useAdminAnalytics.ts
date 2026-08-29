import { useQuery } from "@tanstack/react-query";
import { getAdminAnalytics, type AdminAnalyticsRange } from "@/pages/dashboard/admin/_api/adminApi";
import { parseEnumQueryParam, useQueryParamState } from "@/shared/hooks/useQueryParamState";
import { queryKeys } from "@/shared/lib/queryKeys";

export function useAdminAnalyticsRange(initialRange: AdminAnalyticsRange = "30d") {
    const { value, setValue } = useQueryParamState<AdminAnalyticsRange>({
        key: "analytics[range]",
        defaultValue: initialRange,
        parse: parseEnumQueryParam(["7d", "30d", "90d"], initialRange)
    });

    return [value, setValue] as const;
}

export function useAdminAnalytics() {
    const [range, setRange] = useAdminAnalyticsRange();
    const analyticsQuery = useQuery({
        queryKey: queryKeys.admin.analytics(range),
        queryFn: () => getAdminAnalytics(range)
    });

    return {
        range,
        setRange,
        analyticsQuery,
        analytics: analyticsQuery.data
    };
}
