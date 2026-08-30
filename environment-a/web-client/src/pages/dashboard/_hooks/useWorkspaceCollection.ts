import { useCallback, useEffect, useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getStarred, getTrash, WORKSPACE_PAGE_SIZE } from "@/pages/dashboard/_api/workspaceApi";
import { queryKeys } from "@/shared/lib/queryKeys";
import type { WorkspaceCollectionPage } from "@/shared/types/workspace";
import { usePagination } from "@/shared/hooks/usePagination";

export type WorkspaceCollectionMode = "trash" | "starred";

export function useWorkspaceCollection(mode: WorkspaceCollectionMode) {
    const pagination = usePagination({ queryParam: `${mode}.page`, pageSize: WORKSPACE_PAGE_SIZE });
    const query = useInfiniteQuery({
        queryKey: mode === "trash" ? queryKeys.workspace.trashPages : queryKeys.workspace.starredPages,
        initialPageParam: 0,
        queryFn: ({ pageParam }) => mode === "trash"
            ? getTrash({ limit: pagination.pageSize, offset: pageParam * pagination.pageSize })
            : getStarred({ limit: pagination.pageSize, offset: pageParam * pagination.pageSize }),
        getNextPageParam: (lastPage: WorkspaceCollectionPage, pages) => {
            const nextPage = pages.length;
            const largestCollection = Math.max(lastPage.directory_total, lastPage.file_total);
            return nextPage * pagination.pageSize < largestCollection ? nextPage : undefined;
        }
    });
    const pages = query.data?.pages ?? [];
    const firstPage = pages[0];
    const directories = useMemo(() => pages.flatMap((page) => page.directories), [pages]);
    const files = useMemo(() => pages.flatMap((page) => page.files), [pages]);

    useEffect(() => {
        const loadedPage = Math.max(0, pages.length - 1);
        if (
            pagination.page <= loadedPage
            || !query.hasNextPage
            || query.isFetchingNextPage
            || query.isError
        ) {
            return;
        }

        void query.fetchNextPage();
    }, [pages.length, pagination.page, query.fetchNextPage, query.hasNextPage, query.isError, query.isFetchingNextPage]);

    const loadMore = useCallback(async () => {
        if (!query.hasNextPage || query.isFetchingNextPage) {
            return;
        }

        const result = await query.fetchNextPage();
        const loadedPages = result.data?.pages.length ?? 0;
        if (loadedPages > 0) {
            pagination.setPage(loadedPages - 1);
        }
    }, [pagination.setPage, query.fetchNextPage, query.hasNextPage, query.isFetchingNextPage]);

    return {
        page: pagination.page,
        directories,
        files,
        total: firstPage?.total ?? 0,
        isLoading: query.isLoading,
        isError: query.isError,
        isFetchingNextPage: query.isFetchingNextPage,
        hasMore: query.hasNextPage ?? false,
        loadMore
    };
}
