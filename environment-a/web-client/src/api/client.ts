import { env } from "../config/env";
import type {
  AuthUser,
  DirectoryRecord,
  FileRecord,
  LoginResponse,
  UploadCommitResult
} from "../types";

type RequestOptions = {
  method?: string;
  token?: string;
  body?: unknown;
};

async function requestJSON<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.body ? { "Content-Type": "application/json" } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? `request failed with status ${response.status}`);
  }

  return payload as T;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  return requestJSON<LoginResponse>("/api/v1/auth/login", {
    method: "POST",
    body: { email, password }
  });
}

export async function whoAmI(token: string): Promise<AuthUser> {
  const response = await requestJSON<{ user: AuthUser }>("/api/v1/auth/me", {
    token
  });

  return response.user;
}

export async function logout(token: string): Promise<void> {
  await requestJSON("/api/v1/auth/logout", {
    method: "POST",
    token
  });
}

export async function getRoots(token: string): Promise<DirectoryRecord[]> {
  const response = await requestJSON<{ directories: DirectoryRecord[] }>(
    "/api/v1/directories/tree",
    { token }
  );
  return response.directories;
}

export async function getSubtree(token: string, rootID: string): Promise<DirectoryRecord[]> {
  const response = await requestJSON<{ directories: DirectoryRecord[] }>(
    `/api/v1/directories/tree?root_id=${encodeURIComponent(rootID)}`,
    { token }
  );
  return response.directories;
}

export async function createDirectory(
  token: string,
  name: string,
  parentID?: string
): Promise<DirectoryRecord> {
  const response = await requestJSON<{ directory: DirectoryRecord }>("/api/v1/directories", {
    method: "POST",
    token,
    body: {
      name,
      parent_id: parentID ?? ""
    }
  });

  return response.directory;
}

export async function listFiles(token: string, directoryID: string): Promise<FileRecord[]> {
  const response = await requestJSON<{ files: FileRecord[] }>(
    `/api/v1/directories/${encodeURIComponent(directoryID)}/files`,
    { token }
  );

  return response.files;
}

export async function fileDetail(token: string, fileID: string): Promise<FileRecord> {
  const response = await requestJSON<{ file: FileRecord }>(
    `/api/v1/files/${encodeURIComponent(fileID)}`,
    { token }
  );

  return response.file;
}

export async function softDelete(token: string, fileID: string): Promise<void> {
  await requestJSON(`/api/v1/files/${encodeURIComponent(fileID)}`, {
    method: "DELETE",
    token
  });
}

export async function uploadFile(
  token: string,
  directoryID: string,
  file: File,
  onProgress: (percentage: number) => void
): Promise<{ file: FileRecord; upload_commit_result: UploadCommitResult }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${env.apiBaseUrl}/api/v1/files`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (event: ProgressEvent<EventTarget>) => {
      if (!event.lengthComputable) {
        return;
      }

      const percentage = Math.round((event.loaded / event.total) * 100);
      onProgress(percentage);
    };

    xhr.onerror = () => reject(new Error("upload failed"));

    xhr.onload = () => {
      let payload: {
        error?: string;
        file?: FileRecord;
        upload_commit_result?: UploadCommitResult;
      } = {};

      try {
        payload = JSON.parse(xhr.responseText) as typeof payload;
      } catch {
        payload = {};
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(payload.error ?? `upload failed with status ${xhr.status}`));
        return;
      }

      if (!payload.file || !payload.upload_commit_result) {
        reject(new Error("invalid upload response"));
        return;
      }

      resolve({
        file: payload.file,
        upload_commit_result: payload.upload_commit_result
      });
    };

    const form = new FormData();
    form.append("directory_id", directoryID);
    form.append("file", file);

    xhr.send(form);
  });
}

export async function downloadFile(token: string, file: FileRecord): Promise<void> {
  const response = await fetch(
    `${env.apiBaseUrl}/api/v1/files/${encodeURIComponent(file.id)}/download`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? `download failed with status ${response.status}`);
  }

  const blob = await response.blob();
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = file.name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(href);
}
