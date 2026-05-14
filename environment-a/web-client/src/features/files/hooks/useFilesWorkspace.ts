import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  downloadFile,
  fileDetail,
  listFiles,
  permanentDeleteFile,
  restoreFile,
  setFileStarred,
  softDelete,
  uploadFile
} from "@/features/files/api/fileApi";
import { queryKeys } from "@/shared/lib/queryKeys";
import type { UploadCommitResult } from "@/shared/types/domain";

export function useFilesWorkspace(enabled: boolean, selectedDirectoryID: string | null) {
  const queryClient = useQueryClient();
  const [selectedFileID, setSelectedFileID] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [lastUploadResult, setLastUploadResult] = useState<UploadCommitResult | null>(null);

  const filesQuery = useQuery({
    queryKey: queryKeys.files.byDirectory(selectedDirectoryID ?? "root"),
    queryFn: () => listFiles(selectedDirectoryID),
    enabled
  });

  useEffect(() => {
    if (!filesQuery.data) {
      setSelectedFileID(null);
      return;
    }

    if (filesQuery.data.length === 0) {
      setSelectedFileID(null);
      return;
    }

    setSelectedFileID((current) => {
      if (!current) {
        return filesQuery.data[0].id;
      }

      return filesQuery.data.some((item) => item.id === current) ? current : filesQuery.data[0].id;
    });
  }, [filesQuery.data]);

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
    const files = filesQuery.data ?? [];
    const totalBytes = files.reduce((sum, item) => sum + item.size_bytes, 0);
    const totalChunks = files.reduce((sum, item) => sum + (item.chunk_count || 0), 0);
    const reusedChunks = files.reduce((sum, item) => sum + (item.reuse_chunk_count || 0), 0);
    const dedup = totalChunks > 0
      ? `${((reusedChunks / totalChunks) * 100).toFixed(2)}%`
      : lastUploadResult
        ? `${(lastUploadResult.dedup_ratio * 100).toFixed(2)}%`
        : "-";

    return {
      totalFiles: files.length,
      totalBytes,
      dedup
    };
  }, [filesQuery.data, lastUploadResult]);

  return {
    files: filesQuery.data ?? [],
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
