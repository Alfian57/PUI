import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchActivityLogs, ACTIVITY_PAGE_SIZE } from "@/pages/dashboard/activity/_api/activityApi";
import { queryKeys } from "@/shared/lib/queryKeys";

export function useActivityLogs() {
    const activityQuery = useInfiniteQuery({
        queryKey: queryKeys.activity.infinite,
        initialPageParam: 0,
        queryFn: ({ pageParam }) => fetchActivityLogs(pageParam),
        getNextPageParam: (lastPage, pages) => {
            const nextPage = pages.length;
            return nextPage * ACTIVITY_PAGE_SIZE < lastPage.total ? nextPage : undefined;
        }
    });
    const pages = activityQuery.data?.pages ?? [];
    const total = pages[0]?.total ?? 0;

    return {
        isLoading: activityQuery.isLoading,
        isError: activityQuery.isError,
        isFetchingNextPage: activityQuery.isFetchingNextPage,
        logs: pages.flatMap((page) => page.activity_logs),
        total,
        hasMore: activityQuery.hasNextPage ?? false,
        loadedPage: Math.max(0, pages.length - 1),
        loadNextPage: activityQuery.fetchNextPage
    };
}
