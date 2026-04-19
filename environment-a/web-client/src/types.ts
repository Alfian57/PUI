export type {
  AuthUser,
  DirectoryRecord,
  FileRecord,
  UploadCommitResult,
  LoginResponse
} from "@/shared/types/domain";

export type APIError = {
  status: string;
  error: string;
};
