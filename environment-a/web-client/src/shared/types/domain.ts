export type AuthUser = {
  id: string;
  full_name: string;
  email: string;
};

export type DirectoryRecord = {
  id: string;
  name: string;
  depth: number;
  parent_id?: string | null;
  created_at: string;
};

export type FileRecord = {
  id: string;
  directory_id: string;
  name: string;
  size_bytes: number;
  mime_type: string;
  manifest_id: string;
  created_at: string;
  deleted_at?: string | null;
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

export type LoginResponse = {
  status: string;
  access_token: string;
  expires_at: string;
  user: AuthUser;
};

export type HealthState = {
  status: string;
  environment: string;
};
