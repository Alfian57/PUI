import type { DirectoryRecord } from "@/shared/types/directories";
import type { FileRecord } from "@/shared/types/files";

export type WorkspaceCollection = {
  directories: DirectoryRecord[];
  files: FileRecord[];
};

export type WorkspaceCollectionPage = WorkspaceCollection & {
  status: string;
  total: number;
  directory_total: number;
  file_total: number;
  limit: number;
  offset: number;
};
