export type AuthUser = {
  id: string;
  full_name: string;
  email: string;
  role: "user" | "admin";
};

export type DirectoryRecord = {
  id: string;
  name: string;
  depth: number;
  parent_id?: string | null;
  created_at: string;
  deleted_at?: string | null;
  starred_at?: string | null;
};

export type FileRecord = {
  id: string;
  directory_id?: string | null;
  name: string;
  size_bytes: number;
  mime_type: string;
  manifest_id: string;
  status_penyimpanan: "pending" | "committed" | "failed";
  chunk_count: number;
  new_chunk_count: number;
  reuse_chunk_count: number;
  dedup_ratio: number;
  created_at: string;
  deleted_at?: string | null;
  starred_at?: string | null;
};

export type UploadCommitResult = {
  manifest_id: string;
  file_hash: string;
  total_size_bytes: number;
  chunk_count: number;
  dedup_ratio: number;
  immutable: boolean;
  new_chunk_count: number;
  reuse_chunk_count: number;
};

export type ManifestInfo = {
  manifest_id: string;
  file_hash: string;
  total_size_bytes: number;
  chunk_count: number;
  immutable: boolean;
  created_at: string;
};

export type LoginResponse = {
  status: string;
  access_token: string;
  expires_at: string;
  user: AuthUser;
};

export type RegisterRequest = {
  full_name: string;
  email: string;
  password: string;
  confirm_password: string;
};

export type PasswordResetConfirmRequest = {
  token: string;
  new_password: string;
  confirm_password: string;
};

export type UpdateProfileRequest = {
  full_name: string;
  email: string;
  current_password?: string;
  new_password?: string;
};

export type HealthState = {
  status: string;
  environment: string;
};

export type WorkspaceCollection = {
  directories: DirectoryRecord[];
  files: FileRecord[];
};

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
