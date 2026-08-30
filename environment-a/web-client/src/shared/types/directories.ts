import type { FileRecord } from "./files";

export type DirectoryRecord = {
  id: string;
  name: string;
  depth: number;
  parent_id?: string | null;
  created_at: string;
  deleted_at?: string | null;
  starred_at?: string | null;
};

export type DirectoryDetailScope = "starred" | "trash";

export type DirectoryDetailSummary = {
  directory_count: number;
  file_count: number;
  total_bytes: number;
};

export type DirectoryDetail = {
  directory: DirectoryRecord;
  summary: DirectoryDetailSummary;
  directories: DirectoryRecord[];
  files: FileRecord[];
};
