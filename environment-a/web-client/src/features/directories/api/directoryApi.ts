import { http } from "@/shared/api/http";
import type { DirectoryRecord } from "@/shared/types/domain";

async function getTree(rootID?: string): Promise<DirectoryRecord[]> {
  const query = rootID ? `?root_id=${encodeURIComponent(rootID)}` : "";
  const { data } = await http.get<{ directories: DirectoryRecord[] }>(`/api/v1/directories/tree${query}`);
  return data.directories;
}

export async function getDirectoryTreeExpanded(): Promise<DirectoryRecord[]> {
  const roots = await getTree();
  if (roots.length === 0) {
    return [];
  }

  const subtrees = await Promise.all(roots.map((root) => getTree(root.id)));
  const map = new Map<string, DirectoryRecord>();

  for (const subtree of subtrees) {
    for (const node of subtree) {
      map.set(node.id, node);
    }
  }

  return Array.from(map.values()).sort((left, right) => {
    if (left.depth !== right.depth) {
      return left.depth - right.depth;
    }

    return left.name.localeCompare(right.name);
  });
}

export async function createDirectory(name: string, parentID?: string): Promise<DirectoryRecord> {
  const { data } = await http.post<{ directory: DirectoryRecord }>("/api/v1/directories", {
    name,
    parent_id: parentID ?? ""
  });

  return data.directory;
}

export async function softDeleteDirectory(directoryID: string): Promise<DirectoryRecord> {
  const { data } = await http.delete<{ directory: DirectoryRecord }>(
    `/api/v1/directories/${encodeURIComponent(directoryID)}`
  );
  return data.directory;
}

export async function restoreDirectory(directoryID: string): Promise<DirectoryRecord> {
  const { data } = await http.post<{ directory: DirectoryRecord }>(
    `/api/v1/directories/${encodeURIComponent(directoryID)}/restore`
  );
  return data.directory;
}

export async function permanentDeleteDirectory(directoryID: string): Promise<void> {
  await http.delete(`/api/v1/directories/${encodeURIComponent(directoryID)}/permanent`);
}

export async function setDirectoryStarred(directoryID: string, starred: boolean): Promise<DirectoryRecord> {
  const { data } = starred
    ? await http.put<{ directory: DirectoryRecord }>(`/api/v1/directories/${encodeURIComponent(directoryID)}/star`)
    : await http.delete<{ directory: DirectoryRecord }>(`/api/v1/directories/${encodeURIComponent(directoryID)}/star`);
  return data.directory;
}

export async function getBreadcrumb(directoryID: string): Promise<DirectoryRecord[]> {
  const { data } = await http.get<{ breadcrumb: DirectoryRecord[] }>(
    `/api/v1/directories/${encodeURIComponent(directoryID)}/breadcrumb`
  );
  return data.breadcrumb;
}
