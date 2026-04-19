import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createDirectory, getDirectoryTreeExpanded } from "@/features/directories/api/directoryApi";
import { queryKeys } from "@/shared/lib/queryKeys";

export function useDirectoryTree(enabled: boolean) {
  const queryClient = useQueryClient();
  const [selectedDirectoryID, setSelectedDirectoryID] = useState<string | null>(null);

  const directoriesQuery = useQuery({
    queryKey: queryKeys.directories.tree,
    queryFn: getDirectoryTreeExpanded,
    enabled
  });

  useEffect(() => {
    if (!directoriesQuery.data) {
      return;
    }

    if (directoriesQuery.data.length === 0) {
      setSelectedDirectoryID(null);
      return;
    }

    setSelectedDirectoryID((current) => {
      if (!current) {
        return directoriesQuery.data[0].id;
      }

      return directoriesQuery.data.some((item) => item.id === current)
        ? current
        : directoriesQuery.data[0].id;
    });
  }, [directoriesQuery.data]);

  const createFolderMutation = useMutation({
    mutationFn: ({ name, parentID }: { name: string; parentID?: string | null }) =>
      createDirectory(name, parentID ?? undefined),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.directories.tree });
    }
  });

  const refresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.directories.tree });
  };

  return {
    directories: directoriesQuery.data ?? [],
    selectedDirectoryID,
    setSelectedDirectoryID,
    isLoading: directoriesQuery.isLoading,
    refresh,
    createFolder: (name: string, parentID?: string | null) =>
      createFolderMutation.mutateAsync({ name, parentID }),
    createFolderState: createFolderMutation
  };
}
