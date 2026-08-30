import { useQuery } from "@tanstack/react-query";
import { getDirectoryDetail } from "@/pages/dashboard/_api/directoryApi";
import { queryKeys } from "@/shared/lib/queryKeys";
import type { DirectoryDetailScope } from "@/shared/types/directories";

export function useDirectoryDetail(directoryID: string | undefined, scope: DirectoryDetailScope) {
    const query = useQuery({
        queryKey: queryKeys.directories.detail(directoryID ?? "none", scope),
        queryFn: () => getDirectoryDetail(directoryID as string, scope),
        enabled: Boolean(directoryID)
    });

    return {
        directory: query.data?.directory ?? null,
        summary: query.data?.summary ?? null,
        directories: query.data?.directories ?? [],
        files: query.data?.files ?? [],
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error
    };
}
