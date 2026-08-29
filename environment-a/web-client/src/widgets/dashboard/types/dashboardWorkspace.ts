import type { useDirectoryTree } from "@/pages/dashboard/_hooks/useDirectoryTree";
import type { useFilesWorkspace } from "@/pages/dashboard/_hooks/useFilesWorkspace";
import type { DirectoryRecord } from "@/shared/types/directories";
import type { FileRecord } from "@/shared/types/files";

export type FileModalTab = "preview" | "detail";

export type WorkspaceBulkSelection = {
    folders: DirectoryRecord[];
    files: FileRecord[];
};

export type DashboardWorkspaceActionHandlers = {
    createFolder: (name: string, parentID: string | null) => Promise<void>;
    onDownload: (file: FileRecord) => Promise<void>;
    onSoftDelete: (file: FileRecord) => Promise<void>;
    onSoftDeleteFolder: (directoryID: string, name: string) => Promise<void>;
    onToggleFileStarred: (file: FileRecord) => Promise<void>;
    onToggleFolderStarred: (directoryID: string, name: string, starred: boolean) => Promise<void>;
    onRestoreFile: (file: FileRecord) => Promise<void>;
    onRestoreFolder: (directoryID: string, name: string) => Promise<void>;
    onPermanentDeleteFile: (file: FileRecord) => Promise<void>;
    onPermanentDeleteFolder: (directoryID: string, name: string) => Promise<void>;
    onBulkSoftDelete: (selection: WorkspaceBulkSelection) => Promise<void>;
    onBulkStar: (selection: WorkspaceBulkSelection) => Promise<void>;
    onBulkUnstar: (selection: WorkspaceBulkSelection) => Promise<void>;
    onBulkRestore: (selection: WorkspaceBulkSelection) => Promise<void>;
    onBulkPermanentDelete: (selection: WorkspaceBulkSelection) => Promise<void>;
    onUpload: (file: File) => Promise<void>;
};

export type DashboardWorkspaceContext = Omit<DashboardWorkspaceActionHandlers, "createFolder"> & {
    directories: ReturnType<typeof useDirectoryTree>;
    files: ReturnType<typeof useFilesWorkspace>;
    detailsOpen: boolean;
    setDetailsOpen: (value: boolean) => void;
    fileModalTab: FileModalTab;
    setFileModalTab: (value: FileModalTab) => void;
    viewMode: "list" | "grid";
    setViewMode: (value: "list" | "grid") => void;
    onCreateFolder: () => void;
    onSelectDirectory: (directoryID: string | null) => void;
    onSelectFile: (fileID: string) => void;
};
