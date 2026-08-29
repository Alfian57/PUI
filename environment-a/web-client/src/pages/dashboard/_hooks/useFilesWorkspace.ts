import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  downloadFile,
  fileDetail,
  FILE_PAGE_SIZE,
  listFiles,
  permanentDeleteFile,
  restoreFile,
  setFileStarred,
  softDelete,
  uploadFile
} from "@/pages/dashboard/_api/fileApi";
import { resolveTimeRange } from "@/pages/dashboard/_lib/timeFilter";
import { queryKeys } from "@/shared/lib/queryKeys";
import type { UploadCommitResult } from "@/shared/types/files";
import type { WorkspaceCustomTimeRange, WorkspaceTimeFilter } from "@/widgets/dashboard/components/_types/driveToolbar";
import type { WorkspaceSortOption } from "@/widgets/dashboard/components/_types/workspace";
import { parseEnumQueryParam, serializeQueryParam, useQueryParamState } from "@/shared/hooks/useQueryParamState";
import { usePagination } from "@/shared/hooks/usePagination";

const SORT_OPTIONS = ["newest", "oldest", "name-asc", "name-desc", "type", "starred"] as const;
const TIME_FILTER_OPTIONS = ["all", "today", "7d", "30d", "month", "year", "custom"] as const;

export function useFilesWorkspace(enabled: boolean, selectedDirectoryID: string | null) {
  const queryClient = useQueryClient();
  const pagination = usePagination({ queryParam: "files[page]", pageSize: FILE_PAGE_SIZE });
  const { value: sortOption, setValue: setSortOption } = useQueryParamState<WorkspaceSortOption>({
    key: "files[sort]",
    defaultValue: "newest",
    parse: parseEnumQueryParam(SORT_OPTIONS, "newest")
  });
  const { value: timeFilter, setValue: setTimeFilter } = useQueryParamState<WorkspaceTimeFilter>({
    key: "files[time]",
    defaultValue: "all",
    parse: parseEnumQueryParam(TIME_FILTER_OPTIONS, "all")
  });
  const { value: customFrom, setValue: setCustomFrom } = useQueryParamState<string>({
    key: "files[from]",
    defaultValue: "",
    serialize: serializeQueryParam
  });
  const { value: customTo, setValue: setCustomTo } = useQueryParamState<string>({
    key: "files[to]",
    defaultValue: "",
    serialize: serializeQueryParam
  });
  const customTimeRange = useMemo<WorkspaceCustomTimeRange>(() => ({ from: customFrom, to: customTo }), [customFrom, customTo]);
  const createdRange = useMemo(() => resolveTimeRange(timeFilter, customTimeRange), [customTimeRange, timeFilter]);
  const createdFrom = createdRange?.from.toISOString();
  const createdTo = createdRange?.to.toISOString();
  const fileFilterKey = useMemo(() => JSON.stringify({
    directoryID: selectedDirectoryID,
    sortOption,
    createdFrom,
    createdTo
  }), [createdFrom, createdTo, selectedDirectoryID, sortOption]);
  const previousFileFilterKey = useRef(fileFilterKey);
  const [selectedFileID, setSelectedFileID] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [lastUploadResult, setLastUploadResult] = useState<UploadCommitResult | null>(null);

  const filesQuery = useInfiniteQuery({
    queryKey: queryKeys.files.byDirectory(selectedDirectoryID ?? "root", fileFilterKey),
    initialPageParam: 0,
    queryFn: ({ pageParam }) => listFiles(selectedDirectoryID, {
      limit: pagination.pageSize,
      offset: pageParam * pagination.pageSize,
      sort: sortOption,
      createdFrom,
      createdTo
    }),
    getNextPageParam: (lastPage, pages) => {
      const nextPage = pages.length;
      return nextPage * pagination.pageSize < lastPage.total ? nextPage : undefined;
    },
    enabled
  });
  const filePages = filesQuery.data?.pages ?? [];
  const firstPage = filePages[0];
  const fileRecords = useMemo(() => filePages.flatMap((page) => page.files), [filePages]);
  const filesTotal = firstPage?.total ?? 0;

  useEffect(() => {
    if (previousFileFilterKey.current === fileFilterKey) {
      return;
    }

    previousFileFilterKey.current = fileFilterKey;
    pagination.setPage(0);
  }, [fileFilterKey, pagination.setPage]);

  useEffect(() => {
    const loadedPage = Math.max(0, filePages.length - 1);
    if (
      !enabled
      || pagination.page <= loadedPage
      || !filesQuery.hasNextPage
      || filesQuery.isFetchingNextPage
      || filesQuery.isError
    ) {
      return;
    }

    void filesQuery.fetchNextPage();
  }, [enabled, filePages.length, filesQuery.fetchNextPage, filesQuery.hasNextPage, filesQuery.isError, filesQuery.isFetchingNextPage, pagination.page]);

  useEffect(() => {
    if (!fileRecords.length) {
      setSelectedFileID(null);
      return;
    }

    setSelectedFileID((current) => {
      if (!current) {
        return fileRecords[0].id;
      }

      return fileRecords.some((item) => item.id === current) ? current : fileRecords[0].id;
    });
  }, [fileRecords]);

  const detailQuery = useQuery({
    queryKey: queryKeys.files.detail(selectedFileID ?? "none"),
    queryFn: () => fileDetail(selectedFileID as string),
    enabled: enabled && Boolean(selectedFileID)
  });

  const uploadMutation = useMutation({
    mutationFn: ({ directoryID, file }: { directoryID: string | null; file: File }) =>
      uploadFile(directoryID, file, setUploadProgress),
    onSuccess: async (result) => {
      setLastUploadResult(result.upload_commit_result);
      setSelectedFileID(result.file.id);
      setUploadProgress(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.directories.tree });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.files.byDirectory(result.file.directory_id ?? "root")
      });
    },
    onSettled: () => {
      setUploadProgress(null);
    }
  });

  const softDeleteMutation = useMutation({
    mutationFn: (fileID: string) => softDelete(fileID),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.files.byDirectory(selectedDirectoryID ?? "root")
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.workspace.trash });
      await queryClient.invalidateQueries({ queryKey: queryKeys.workspace.starred });
    }
  });

  const downloadMutation = useMutation({
    mutationFn: downloadFile
  });

  async function invalidateFileWorkspace(directoryID?: string | null): Promise<void> {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.files.byDirectory(directoryID ?? selectedDirectoryID ?? "root")
    });
    await queryClient.invalidateQueries({ queryKey: queryKeys.workspace.trash });
    await queryClient.invalidateQueries({ queryKey: queryKeys.workspace.starred });
  }

  const restoreMutation = useMutation({
    mutationFn: restoreFile,
    onSuccess: async (file) => invalidateFileWorkspace(file.directory_id)
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: permanentDeleteFile,
    onSuccess: async () => invalidateFileWorkspace()
  });

  const starMutation = useMutation({
    mutationFn: ({ fileID, starred }: { fileID: string; starred: boolean }) =>
      setFileStarred(fileID, starred),
    onSuccess: async (file) => invalidateFileWorkspace(file.directory_id)
  });

  const stats = useMemo(() => {
    const totalChunks = firstPage?.total_chunks ?? 0;
    const reusedChunks = firstPage?.reused_chunks ?? 0;
    const dedup = totalChunks > 0
      ? `${((reusedChunks / totalChunks) * 100).toFixed(2)}%`
      : lastUploadResult
        ? `${(lastUploadResult.dedup_ratio * 100).toFixed(2)}%`
        : "-";

    return {
      totalFiles: filesTotal,
      totalBytes: firstPage?.total_bytes ?? 0,
      dedup
    };
  }, [filesTotal, firstPage?.reused_chunks, firstPage?.total_bytes, firstPage?.total_chunks, lastUploadResult]);

  const setCustomTimeRange = useCallback((value: WorkspaceCustomTimeRange) => {
    setCustomFrom(value.from);
    setCustomTo(value.to);
  }, [setCustomFrom, setCustomTo]);

  const loadMoreFiles = useCallback(async () => {
    if (!filesQuery.hasNextPage || filesQuery.isFetchingNextPage) {
      return;
    }

    const result = await filesQuery.fetchNextPage();
    const loadedPages = result.data?.pages.length ?? 0;
    if (loadedPages > 0) {
      pagination.setPage(loadedPages - 1);
    }
  }, [filesQuery.fetchNextPage, filesQuery.hasNextPage, filesQuery.isFetchingNextPage, pagination.setPage]);

  return {
    files: fileRecords,
    filesTotal,
    filesHasMore: filesQuery.hasNextPage ?? false,
    filesIsFetchingNextPage: filesQuery.isFetchingNextPage,
    loadMoreFiles,
    sortOption,
    setSortOption,
    timeFilter,
    setTimeFilter,
    customTimeRange,
    setCustomTimeRange,
    fileDetail: detailQuery.data ?? null,
    selectedFileID,
    setSelectedFileID,
    uploadProgress,
    lastUploadResult,
    stats,
    filesState: filesQuery,
    detailState: detailQuery,
    upload: (file: File) => {
      setUploadProgress(0);
      return uploadMutation.mutateAsync({
        directoryID: selectedDirectoryID,
        file
      });
    },
    uploadState: uploadMutation,
    softDelete: (fileID: string) => softDeleteMutation.mutateAsync(fileID),
    softDeleteState: softDeleteMutation,
    restore: (fileID: string) => restoreMutation.mutateAsync(fileID),
    restoreState: restoreMutation,
    permanentDelete: (fileID: string) => permanentDeleteMutation.mutateAsync(fileID),
    permanentDeleteState: permanentDeleteMutation,
    setStarred: (fileID: string, starred: boolean) => starMutation.mutateAsync({ fileID, starred }),
    starState: starMutation,
    download: downloadMutation.mutateAsync,
    downloadState: downloadMutation
  };
}
