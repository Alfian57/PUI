import { http } from "@/shared/api/http";
import type { WorkspaceCollection } from "@/shared/types/domain";

export async function getTrash(): Promise<WorkspaceCollection> {
  const { data } = await http.get<WorkspaceCollection>("/api/v1/trash");
  return {
    directories: data.directories ?? [],
    files: data.files ?? []
  };
}

export async function getStarred(): Promise<WorkspaceCollection> {
  const { data } = await http.get<WorkspaceCollection>("/api/v1/starred");
  return {
    directories: data.directories ?? [],
    files: data.files ?? []
  };
}
