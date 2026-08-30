import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createDirectory,
  getDirectoryTreeExpanded,
  permanentDeleteDirectory,
  restoreDirectory,
  setDirectoryStarred,
  softDeleteDirectory
} from "@/pages/dashboard/_api/directoryApi";
import { queryKeys } from "@/shared/lib/queryKeys";

export function useDirectoryTree(enabled: boolean, requestedDirectoryID: string | null = null) {
  const queryClient = useQueryClient();
  const [selectedDirectoryID, setSelectedDirectoryID] = useState<string | null>(null);
  const [resolvedDirectoryRequest, setResolvedDirectoryRequest] = useState<string | null>(null);

  const directoriesQuery = useQuery({
    queryKey: queryKeys.directories.tree,
    queryFn: getDirectoryTreeExpanded,
    enabled
  });

  useEffect(() => {
    if (!directoriesQuery.isSuccess) {
      return;
    }

    const resolvedDirectoryID = requestedDirectoryID
      && directoriesQuery.data.some((item) => item.id === requestedDirectoryID)
      ? requestedDirectoryID
      : null;
    setSelectedDirectoryID(resolvedDirectoryID);
    setResolvedDirectoryRequest(requestedDirectoryID);
  }, [directoriesQuery.data, directoriesQuery.isSuccess, requestedDirectoryID]);

  const isDirectorySelectionReady = !requestedDirectoryID
    || (directoriesQuery.isSuccess && resolvedDirectoryRequest === requestedDirectoryID);
  const effectiveSelectedDirectoryID = resolvedDirectoryRequest === requestedDirectoryID
    ? selectedDirectoryID
    : null;

  const createFolderMutation = useMutation({
    mutationFn: ({ name, parentID }: { name: string; parentID?: string | null }) =>
      createDirectory(name, parentID ?? undefined),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.directories.tree });
    }
  });

  async function invalidateWorkspace(): Promise<void> {
    await queryClient.invalidateQueries({ queryKey: queryKeys.directories.tree });
    await queryClient.invalidateQueries({ queryKey: queryKeys.workspace.trash });
    await queryClient.invalidateQueries({ queryKey: queryKeys.workspace.starred });
  }

  const softDeleteMutation = useMutation({
    mutationFn: softDeleteDirectory,
    onSuccess: invalidateWorkspace
  });

  const restoreMutation = useMutation({
    mutationFn: restoreDirectory,
    onSuccess: invalidateWorkspace
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: permanentDeleteDirectory,
    onSuccess: invalidateWorkspace
  });

  const starMutation = useMutation({
    mutationFn: ({ directoryID, starred }: { directoryID: string; starred: boolean }) =>
      setDirectoryStarred(directoryID, starred),
    onSuccess: invalidateWorkspace
  });

  const refresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.directories.tree });
  };

  return {
    directories: directoriesQuery.data ?? [],
    selectedDirectoryID: effectiveSelectedDirectoryID,
    setSelectedDirectoryID,
    isDirectorySelectionReady,
    isLoading: directoriesQuery.isLoading,
    refresh,
    createFolder: (name: string, parentID?: string | null) =>
      createFolderMutation.mutateAsync({ name, parentID }),
    createFolderState: createFolderMutation,
    softDelete: (directoryID: string) => softDeleteMutation.mutateAsync(directoryID),
    softDeleteState: softDeleteMutation,
    restore: (directoryID: string) => restoreMutation.mutateAsync(directoryID),
    restoreState: restoreMutation,
    permanentDelete: (directoryID: string) => permanentDeleteMutation.mutateAsync(directoryID),
    permanentDeleteState: permanentDeleteMutation,
    setStarred: (directoryID: string, starred: boolean) => starMutation.mutateAsync({ directoryID, starred }),
    starState: starMutation
  };
}
