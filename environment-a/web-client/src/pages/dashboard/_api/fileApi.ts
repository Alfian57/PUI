import { http } from "@/shared/api/http";
import type { FileRecord, ManifestInfo, UploadCommitResult } from "@/shared/types/files";

export const FILE_PAGE_SIZE = 40;

export type FileListOptions = {
  limit?: number;
  offset?: number;
  sort?: string;
  createdFrom?: string;
  createdTo?: string;
};

export type FileListResponse = {
  status: string;
  directory_id?: string;
  total: number;
  limit: number;
  offset: number;
  total_bytes: number;
  total_chunks: number;
  reused_chunks: number;
  files: FileRecord[];
};

export async function listFiles(directoryID: string | null, options: FileListOptions = {}): Promise<FileListResponse> {
  const params = new URLSearchParams();
  if (directoryID) params.set("directory_id", directoryID);
  if (options.limit !== undefined) params.set("limit", String(options.limit));
  if (options.offset !== undefined) params.set("offset", String(options.offset));
  if (options.sort) params.set("sort", options.sort);
  if (options.createdFrom) params.set("created_from", options.createdFrom);
  if (options.createdTo) params.set("created_to", options.createdTo);
  const query = params.toString();
  const { data } = await http.get<FileListResponse>(`/api/v1/files${query ? `?${query}` : ""}`);

  return data;
}

export async function fileDetail(fileID: string): Promise<FileRecord> {
  const { data } = await http.get<{ file: FileRecord }>(`/api/v1/files/${encodeURIComponent(fileID)}`);
  return data.file;
}

export async function softDelete(fileID: string): Promise<void> {
  await http.delete(`/api/v1/files/${encodeURIComponent(fileID)}`);
}

export async function restoreFile(fileID: string): Promise<FileRecord> {
  const { data } = await http.post<{ file: FileRecord }>(`/api/v1/files/${encodeURIComponent(fileID)}/restore`);
  return data.file;
}

export async function permanentDeleteFile(fileID: string): Promise<void> {
  await http.delete(`/api/v1/files/${encodeURIComponent(fileID)}/permanent`);
}

export async function setFileStarred(fileID: string, starred: boolean): Promise<FileRecord> {
  const { data } = starred
    ? await http.put<{ file: FileRecord }>(`/api/v1/files/${encodeURIComponent(fileID)}/star`)
    : await http.delete<{ file: FileRecord }>(`/api/v1/files/${encodeURIComponent(fileID)}/star`);
  return data.file;
}

export async function uploadFile(
  directoryID: string | null,
  file: File,
  onProgress: (percentage: number) => void
): Promise<{ file: FileRecord; upload_commit_result: UploadCommitResult }> {
  const form = new FormData();
  if (directoryID) {
    form.append("directory_id", directoryID);
  }
  form.append("file", file);

  const { data } = await http.post<{ file: FileRecord; upload_commit_result: UploadCommitResult }>(
    "/api/v1/files",
    form,
    {
      headers: {
        "Content-Type": "multipart/form-data"
      },
      onUploadProgress: (event) => {
        if (!event.total) {
          return;
        }

        const percentage = Math.round((event.loaded / event.total) * 100);
        onProgress(percentage);
      }
    }
  );

  return data;
}

export async function downloadFile(file: FileRecord): Promise<void> {
  const response = await http.get<Blob>(`/api/v1/files/${encodeURIComponent(file.id)}/download`, {
    responseType: "blob"
  });

  const href = URL.createObjectURL(response.data);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = file.name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(href);
}

export async function fetchFileBlob(fileID: string): Promise<Blob> {
  const response = await http.get<Blob>(`/api/v1/files/${encodeURIComponent(fileID)}/download`, {
    responseType: "blob"
  });

  return response.data;
}

export async function getFileManifest(fileID: string): Promise<ManifestInfo> {
  const { data } = await http.get<{ manifest: ManifestInfo }>(
    `/api/v1/files/${encodeURIComponent(fileID)}/manifest`
  );
  return data.manifest;
}

export async function searchFiles(
  query: string,
  directoryID?: string,
  limit?: number,
  offset?: number
): Promise<{ files: FileRecord[]; total: number; limit: number; offset: number }> {
  const params = new URLSearchParams({ q: query });
  if (directoryID) params.set("directory_id", directoryID);
  if (limit) params.set("limit", String(limit));
  if (offset) params.set("offset", String(offset));
  const { data } = await http.get<{ files: FileRecord[]; total: number; limit: number; offset: number }>(
    `/api/v1/files/search?${params.toString()}`
  );
  return data;
}
