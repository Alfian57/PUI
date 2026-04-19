import { http } from "@/shared/api/http";
import type { FileRecord, UploadCommitResult } from "@/shared/types/domain";

export async function listFiles(directoryID: string): Promise<FileRecord[]> {
  const { data } = await http.get<{ files: FileRecord[] }>(
    `/api/v1/directories/${encodeURIComponent(directoryID)}/files`
  );

  return data.files;
}

export async function fileDetail(fileID: string): Promise<FileRecord> {
  const { data } = await http.get<{ file: FileRecord }>(`/api/v1/files/${encodeURIComponent(fileID)}`);
  return data.file;
}

export async function softDelete(fileID: string): Promise<void> {
  await http.delete(`/api/v1/files/${encodeURIComponent(fileID)}`);
}

export async function uploadFile(
  directoryID: string,
  file: File,
  onProgress: (percentage: number) => void
): Promise<{ file: FileRecord; upload_commit_result: UploadCommitResult }> {
  const form = new FormData();
  form.append("directory_id", directoryID);
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
