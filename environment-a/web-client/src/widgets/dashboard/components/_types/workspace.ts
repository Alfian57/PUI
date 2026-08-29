import type { DirectoryRecord } from "@/shared/types/directories";
import type { FileRecord } from "@/shared/types/files";

export type WorkspaceSortOption = "newest" | "oldest" | "name-asc" | "name-desc" | "type" | "starred";

export type WorkspaceBulkSelection = {
    folders: DirectoryRecord[];
    files: FileRecord[];
};

export type WorkspaceMode = "normal" | "trash";

export type WorkspaceItem =
    | { kind: "folder"; folder: DirectoryRecord }
    | { kind: "file"; file: FileRecord };

export type WorkspaceInteractionHandlers = {
    onOpenFolder: (directoryID: string) => void;
    onSelectFile: (fileID: string) => void;
    onOpenDetails?: () => void;
    onDownload: (file: FileRecord) => Promise<void>;
    onSoftDelete?: (file: FileRecord) => Promise<void>;
    onSoftDeleteFolder?: (directoryID: string, name: string) => Promise<void>;
    onToggleFileStarred?: (file: FileRecord) => Promise<void>;
    onToggleFolderStarred?: (directoryID: string, name: string, starred: boolean) => Promise<void>;
    onRestoreFile?: (file: FileRecord) => Promise<void>;
    onRestoreFolder?: (directoryID: string, name: string) => Promise<void>;
    onPermanentDeleteFile?: (file: FileRecord) => Promise<void>;
    onPermanentDeleteFolder?: (directoryID: string, name: string) => Promise<void>;
};
