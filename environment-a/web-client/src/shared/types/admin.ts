export type AdminAnalytics = {
  status: string;
  range: "7d" | "30d" | "90d";
  generated_at: string;
  summary: AdminAnalyticsSummary;
  activity: AdminActivityPoint[];
  file_types: AdminFileTypeStat[];
  size_buckets: AdminSizeBucketStat[];
  depths: AdminDepthStat[];
};

export type AdminAnalyticsSummary = {
  total_users: number;
  total_admins: number;
  active_users: number;
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
  deleted_items_in_range: number;
  restored_items_in_range: number;
  starred_actions_in_range: number;
};

export type AdminActivityPoint = {
  date: string;
  logins: number;
  uploads: number;
  downloads: number;
  deletes: number;
  restores: number;
  stars: number;
};

export type AdminFileTypeStat = {
  type: string;
  count: number;
  total_bytes: number;
};

export type AdminSizeBucketStat = {
  bucket: string;
  count: number;
};

export type AdminDepthStat = {
  depth: number;
  count: number;
};

export type AdminSystemStatus = {
  status: string;
  database: string;
  vault_core: string;
  environment: string;
  max_upload_size_bytes: number;
  rate_limit_per_minute: number;
  session_ttl_minutes: number;
  checked_at: string;
};
