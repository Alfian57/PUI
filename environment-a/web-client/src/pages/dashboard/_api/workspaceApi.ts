import { http } from "@/shared/api/http";
import type { WorkspaceCollectionPage } from "@/shared/types/workspace";

export const WORKSPACE_PAGE_SIZE = 40;

export type WorkspacePageOptions = {
  limit?: number;
  offset?: number;
};

export async function getTrash(options: WorkspacePageOptions = {}): Promise<WorkspaceCollectionPage> {
  const { data } = await http.get<WorkspaceCollectionPage>("/api/v1/trash", { params: options });
  return {
    status: data.status,
    total: data.total,
    directory_total: data.directory_total,
    file_total: data.file_total,
    limit: data.limit,
    offset: data.offset,
    directories: data.directories ?? [],
    files: data.files ?? []
  };
}

export async function getStarred(options: WorkspacePageOptions = {}): Promise<WorkspaceCollectionPage> {
  const { data } = await http.get<WorkspaceCollectionPage>("/api/v1/starred", { params: options });
  return {
    status: data.status,
    total: data.total,
    directory_total: data.directory_total,
    file_total: data.file_total,
    limit: data.limit,
    offset: data.offset,
    directories: data.directories ?? [],
    files: data.files ?? []
  };
}
