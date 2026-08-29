export type UserInsight = {
  status: string;
  range: "7d" | "30d" | "90d";
  generated_at: string;
  summary: UserInsightSummary;
  activity: UserActivityPoint[];
  file_types: UserFileTypeStat[];
  largest_files: InsightFileItem[];
  trash_items: InsightTrashItem[];
};

export type UserInsightSummary = {
  active_files: number;
  active_folders: number;
  trash_files: number;
  trash_folders: number;
  starred_files: number;
  starred_folders: number;
  active_storage_bytes: number;
  trash_storage_bytes: number;
  total_chunks: number;
  new_chunks: number;
  reuse_chunks: number;
  dedup_ratio: number;
  uploads_in_range: number;
  downloads_in_range: number;
};

export type UserActivityPoint = {
  date: string;
  uploads: number;
  downloads: number;
  deletes: number;
  restores: number;
  stars: number;
};

export type UserFileTypeStat = {
  type: string;
  count: number;
  total_bytes: number;
};

export type InsightFileItem = {
  id: string;
  name: string;
  size_bytes: number;
  mime_type: string;
  created_at: string;
};

export type InsightTrashItem = {
  id: string;
  kind: "file" | "folder";
  name: string;
  size_bytes: number;
  deleted_at: string;
};
