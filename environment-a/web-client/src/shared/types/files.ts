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
