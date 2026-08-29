export type DirectoryRecord = {
  id: string;
  name: string;
  depth: number;
  parent_id?: string | null;
  created_at: string;
  deleted_at?: string | null;
  starred_at?: string | null;
};
