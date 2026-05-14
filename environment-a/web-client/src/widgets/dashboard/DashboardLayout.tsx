import { useMemo, useState } from "react";
import { Outlet, useNavigate, useOutletContext } from "react-router-dom";
import { CreateFolderModal } from "@/features/directories/components/CreateFolderModal";
import { useDirectoryTree } from "@/features/directories/hooks/useDirectoryTree";
import { useFilesWorkspace } from "@/features/files/hooks/useFilesWorkspace";
import { useAuth } from "@/features/auth/context/AuthSessionProvider";
import { DashboardShell } from "@/widgets/dashboard/components/DashboardShell";
import { DashboardSidebar } from "@/widgets/dashboard/components/DashboardSidebar";
import { DashboardTopbar } from "@/widgets/dashboard/components/DashboardTopbar";
import { AdminTopbar } from "@/widgets/dashboard/components/AdminTopbar";
import type { FileModalTab } from "@/widgets/dashboard/components/FilePreviewModal";
import type { WorkspaceBulkSelection } from "@/widgets/dashboard/components/WorkspaceItemsView";
import { useNoticeCenter } from "@/shared/contexts/NoticeProvider";
import { useConfirmDialog } from "@/shared/ui/ConfirmDialog";
import type { FileRecord } from "@/shared/types/domain";

const MAX_FILE_SIZE = 512 * 1024 * 1024;

type DashboardWorkspaceContext = {
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

export function DashboardLayout(): JSX.Element {
    const auth = useAuth();

    if (!auth.user) {
        return <div />;
    }

    if (auth.user.role === "admin") {
        return <AdminDashboardLayout />;
    }

    return <UserDashboardLayout />;
}

function UserDashboardLayout(): JSX.Element {
    const auth = useAuth();
    const notice = useNoticeCenter();
    const { confirm } = useConfirmDialog();
    const navigate = useNavigate();
    const [createFolderOpen, setCreateFolderOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [fileModalTab, setFileModalTab] = useState<FileModalTab>("preview");
    const [viewMode, setViewMode] = useState<"list" | "grid">("list");
    const directories = useDirectoryTree(Boolean(auth.user));
    const files = useFilesWorkspace(Boolean(auth.user), directories.selectedDirectoryID);

    async function handleCreateFolder(name: string, parentID: string | null): Promise<void> {
        try {
            await directories.createFolder(name, parentID);
            notice.show({ variant: "success", message: "Direktori baru berhasil dibuat." });
            setCreateFolderOpen(false);
        } catch (cause) {
            notice.show({
                variant: "error",
                message: cause instanceof Error ? cause.message : "Gagal membuat direktori."
            });
        }
    }

    async function handleUpload(file: File): Promise<void> {
        if (file.size > MAX_FILE_SIZE) {
            notice.show({
                variant: "error",
                message: `Berkas terlalu besar (${(file.size / 1024 / 1024).toFixed(1)} MB). Maksimal 512 MB.`
            });
            return;
        }

        try {
            await files.upload(file);
            notice.show({ variant: "success", message: "Unggah berkas berhasil diproses." });
        } catch (cause) {
            notice.show({
                variant: "error",
                message: cause instanceof Error ? cause.message : "Unggah gagal."
            });
        }
    }

    async function handleDownload(file: FileRecord): Promise<void> {
        try {
            await files.download(file);
            notice.show({ variant: "success", message: `Unduh ${file.name} berhasil.` });
        } catch (cause) {
            notice.show({
                variant: "error",
                message: cause instanceof Error ? cause.message : "Unduh gagal."
            });
        }
    }

    async function handleSoftDelete(file: FileRecord): Promise<void> {
        const accepted = await confirm({
            title: "Hapus berkas?",
            description: `Berkas "${file.name}" akan dipindahkan ke Sampah dan masih bisa dipulihkan.`,
            confirmLabel: "Hapus berkas",
            variant: "danger"
        });
        if (!accepted) {
            return;
        }

        try {
            await files.softDelete(file.id);
            notice.show({ variant: "success", message: `${file.name} dipindahkan ke tempat sampah.` });
        } catch (cause) {
            notice.show({
                variant: "error",
                message: cause instanceof Error ? cause.message : "Hapus berkas gagal."
            });
        }
    }

    async function handleSoftDeleteFolder(directoryID: string, name: string): Promise<void> {
        const accepted = await confirm({
            title: "Pindahkan direktori ke Sampah?",
            description: `Direktori "${name}" beserta isi di dalamnya akan dipindahkan ke Sampah.`,
            confirmLabel: "Pindahkan",
            variant: "danger"
        });
        if (!accepted) return;

        try {
            await directories.softDelete(directoryID);
            notice.show({ variant: "success", message: `${name} dipindahkan ke Sampah.` });
        } catch (cause) {
            notice.show({ variant: "error", message: cause instanceof Error ? cause.message : "Hapus direktori gagal." });
        }
    }

    async function handleToggleFileStarred(file: FileRecord): Promise<void> {
        const next = !file.starred_at;
        try {
            await files.setStarred(file.id, next);
            notice.show({ variant: "success", message: next ? `${file.name} ditambahkan ke Berbintang.` : `${file.name} dihapus dari Berbintang.` });
        } catch (cause) {
            notice.show({ variant: "error", message: cause instanceof Error ? cause.message : "Gagal mengubah bintang berkas." });
        }
    }

    async function handleToggleFolderStarred(directoryID: string, name: string, starred: boolean): Promise<void> {
        const next = !starred;
        try {
            await directories.setStarred(directoryID, next);
            notice.show({ variant: "success", message: next ? `${name} ditambahkan ke Berbintang.` : `${name} dihapus dari Berbintang.` });
        } catch (cause) {
            notice.show({ variant: "error", message: cause instanceof Error ? cause.message : "Gagal mengubah bintang direktori." });
        }
    }

    async function handleRestoreFile(file: FileRecord): Promise<void> {
        try {
            await files.restore(file.id);
            notice.show({ variant: "success", message: `${file.name} dipulihkan.` });
        } catch (cause) {
            notice.show({ variant: "error", message: cause instanceof Error ? cause.message : "Pulihkan berkas gagal." });
        }
    }

    async function handleRestoreFolder(directoryID: string, name: string): Promise<void> {
        const accepted = await confirm({
            title: "Pulihkan direktori?",
            description: `Direktori "${name}" beserta isi di dalamnya akan dikembalikan ke Berkas Saya.`,
            confirmLabel: "Pulihkan"
        });
        if (!accepted) return;

        try {
            await directories.restore(directoryID);
            notice.show({ variant: "success", message: `${name} dipulihkan.` });
        } catch (cause) {
            notice.show({ variant: "error", message: cause instanceof Error ? cause.message : "Pulihkan direktori gagal." });
        }
    }

    async function handlePermanentDeleteFile(file: FileRecord): Promise<void> {
        const accepted = await confirm({
            title: "Hapus berkas permanen?",
            description: `Metadata berkas "${file.name}" akan dihapus permanen dari HashBox.`,
            confirmLabel: "Hapus permanen",
            variant: "danger"
        });
        if (!accepted) return;

        try {
            await files.permanentDelete(file.id);
            notice.show({ variant: "success", message: `${file.name} dihapus permanen.` });
        } catch (cause) {
            notice.show({ variant: "error", message: cause instanceof Error ? cause.message : "Hapus permanen berkas gagal." });
        }
    }

    async function handlePermanentDeleteFolder(directoryID: string, name: string): Promise<void> {
        const accepted = await confirm({
            title: "Hapus direktori permanen?",
            description: `Direktori "${name}" beserta metadata isi di dalamnya akan dihapus permanen.`,
            confirmLabel: "Hapus permanen",
            variant: "danger"
        });
        if (!accepted) return;

        try {
            await directories.permanentDelete(directoryID);
            notice.show({ variant: "success", message: `${name} dihapus permanen.` });
        } catch (cause) {
            notice.show({ variant: "error", message: cause instanceof Error ? cause.message : "Hapus permanen direktori gagal." });
        }
    }

    async function handleBulkSoftDelete(selection: WorkspaceBulkSelection): Promise<void> {
        const total = selection.files.length + selection.folders.length;
        if (total === 0) return;

        const accepted = await confirm({
            title: "Hapus item terpilih?",
            description: `${total} item akan dipindahkan ke Sampah dan masih bisa dipulihkan.`,
            confirmLabel: "Hapus item",
            variant: "danger"
        });
        if (!accepted) return;

        try {
            await Promise.all([
                ...selection.files.map((file) => files.softDelete(file.id)),
                ...selection.folders.map((folder) => directories.softDelete(folder.id))
            ]);
            notice.show({ variant: "success", message: `${total} item dipindahkan ke Sampah.` });
        } catch (cause) {
            notice.show({ variant: "error", message: cause instanceof Error ? cause.message : "Hapus item gagal." });
        }
    }

    async function handleBulkStar(selection: WorkspaceBulkSelection): Promise<void> {
        const targetFiles = selection.files.filter((file) => !file.starred_at);
        const targetFolders = selection.folders.filter((folder) => !folder.starred_at);
        const total = targetFiles.length + targetFolders.length;
        if (total === 0) {
            notice.show({ variant: "success", message: "Semua item terpilih sudah berbintang." });
            return;
        }

        try {
            await Promise.all([
                ...targetFiles.map((file) => files.setStarred(file.id, true)),
                ...targetFolders.map((folder) => directories.setStarred(folder.id, true))
            ]);
            notice.show({ variant: "success", message: `${total} item ditambahkan ke Berbintang.` });
        } catch (cause) {
            notice.show({ variant: "error", message: cause instanceof Error ? cause.message : "Gagal memberi bintang item." });
        }
    }

    async function handleBulkUnstar(selection: WorkspaceBulkSelection): Promise<void> {
        const targetFiles = selection.files.filter((file) => file.starred_at);
        const targetFolders = selection.folders.filter((folder) => folder.starred_at);
        const total = targetFiles.length + targetFolders.length;
        if (total === 0) {
            notice.show({ variant: "success", message: "Tidak ada item berbintang pada pilihan." });
            return;
        }

        try {
            await Promise.all([
                ...targetFiles.map((file) => files.setStarred(file.id, false)),
                ...targetFolders.map((folder) => directories.setStarred(folder.id, false))
            ]);
            notice.show({ variant: "success", message: `${total} item dihapus dari Berbintang.` });
        } catch (cause) {
            notice.show({ variant: "error", message: cause instanceof Error ? cause.message : "Gagal menghapus bintang item." });
        }
    }

    async function handleBulkRestore(selection: WorkspaceBulkSelection): Promise<void> {
        const total = selection.files.length + selection.folders.length;
        if (total === 0) return;

        const accepted = await confirm({
            title: "Pulihkan item terpilih?",
            description: `${total} item akan dikembalikan ke Berkas Saya.`,
            confirmLabel: "Pulihkan"
        });
        if (!accepted) return;

        try {
            await Promise.all([
                ...selection.files.map((file) => files.restore(file.id)),
                ...selection.folders.map((folder) => directories.restore(folder.id))
            ]);
            notice.show({ variant: "success", message: `${total} item dipulihkan.` });
        } catch (cause) {
            notice.show({ variant: "error", message: cause instanceof Error ? cause.message : "Pulihkan item gagal." });
        }
    }

    async function handleBulkPermanentDelete(selection: WorkspaceBulkSelection): Promise<void> {
        const total = selection.files.length + selection.folders.length;
        if (total === 0) return;

        const accepted = await confirm({
            title: "Hapus permanen item terpilih?",
            description: `${total} item akan dihapus permanen dan tidak bisa dipulihkan.`,
            confirmLabel: "Hapus permanen",
            variant: "danger"
        });
        if (!accepted) return;

        try {
            await Promise.all([
                ...selection.files.map((file) => files.permanentDelete(file.id)),
                ...selection.folders.map((folder) => directories.permanentDelete(folder.id))
            ]);
            notice.show({ variant: "success", message: `${total} item dihapus permanen.` });
        } catch (cause) {
            notice.show({ variant: "error", message: cause instanceof Error ? cause.message : "Hapus permanen item gagal." });
        }
    }

    function handleSelectDirectory(directoryID: string | null): void {
        directories.setSelectedDirectoryID(directoryID);
        setSidebarOpen(false);
        navigate("/app/files");
    }

    function handleSelectFile(fileID: string): void {
        files.setSelectedFileID(fileID);
        setFileModalTab("preview");
        setDetailsOpen(true);
    }

    function handleSelectSearchResult(file: FileRecord): void {
        directories.setSelectedDirectoryID(file.directory_id ?? null);
        files.setSelectedFileID(file.id);
        setFileModalTab("preview");
        setDetailsOpen(true);
        navigate("/app/files");
    }

    async function handleLogout(): Promise<void> {
        const accepted = await confirm({
            title: "Keluar dari HashBox?",
            description: "Sesi aktif akan ditutup dan Anda perlu login kembali untuk membuka berkas.",
            confirmLabel: "Keluar",
            variant: "danger"
        });
        if (!accepted) {
            return;
        }

        await auth.logout();
        notice.show({ variant: "success", message: "Anda berhasil logout." });
        navigate("/login", { replace: true });
    }

    const contextValue = useMemo<DashboardWorkspaceContext>(() => ({
        directories,
        files,
        detailsOpen,
        setDetailsOpen,
        fileModalTab,
        setFileModalTab,
        viewMode,
        setViewMode,
        onCreateFolder: () => {
            setCreateFolderOpen(true);
            setSidebarOpen(false);
        },
        onSelectDirectory: handleSelectDirectory,
        onSelectFile: handleSelectFile,
        onDownload: handleDownload,
        onSoftDelete: handleSoftDelete,
        onSoftDeleteFolder: handleSoftDeleteFolder,
        onToggleFileStarred: handleToggleFileStarred,
        onToggleFolderStarred: handleToggleFolderStarred,
        onRestoreFile: handleRestoreFile,
        onRestoreFolder: handleRestoreFolder,
        onPermanentDeleteFile: handlePermanentDeleteFile,
        onPermanentDeleteFolder: handlePermanentDeleteFolder,
        onBulkSoftDelete: handleBulkSoftDelete,
        onBulkStar: handleBulkStar,
        onBulkUnstar: handleBulkUnstar,
        onBulkRestore: handleBulkRestore,
        onBulkPermanentDelete: handleBulkPermanentDelete,
        onUpload: handleUpload
    }), [detailsOpen, directories, fileModalTab, files, viewMode]);

    if (!auth.user) {
        return <div />;
    }

    return (
        <>
            <DashboardShell
                sidebarOpen={sidebarOpen}
                onSidebarClose={() => setSidebarOpen(false)}
                sidebar={
                    <DashboardSidebar
                        role="user"
                        onClose={() => setSidebarOpen(false)}
                    />
                }
                topbar={
                    <DashboardTopbar
                        user={auth.user}
                        onSelectFile={handleSelectSearchResult}
                        onMenuClick={() => setSidebarOpen(true)}
                        onLogout={() => void handleLogout()}
                    />
                }
            >
                <Outlet context={contextValue} />
            </DashboardShell>

            <CreateFolderModal
                open={createFolderOpen}
                loading={directories.createFolderState.isPending}
                directories={directories.directories}
                defaultParentID={directories.selectedDirectoryID}
                onClose={() => setCreateFolderOpen(false)}
                onCreate={handleCreateFolder}
            />
        </>
    );
}

function AdminDashboardLayout(): JSX.Element {
    const auth = useAuth();
    const notice = useNoticeCenter();
    const { confirm } = useConfirmDialog();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    if (!auth.user) {
        return <div />;
    }

    async function handleLogout(): Promise<void> {
        const accepted = await confirm({
            title: "Keluar dari HashBox?",
            description: "Sesi admin akan ditutup dan Anda perlu login kembali untuk membuka dashboard.",
            confirmLabel: "Keluar",
            variant: "danger"
        });
        if (!accepted) {
            return;
        }

        await auth.logout();
        notice.show({ variant: "success", message: "Anda berhasil logout." });
        navigate("/login", { replace: true });
    }

    return (
        <DashboardShell
            sidebarOpen={sidebarOpen}
            onSidebarClose={() => setSidebarOpen(false)}
            sidebar={(
                <DashboardSidebar
                    role="admin"
                    onClose={() => setSidebarOpen(false)}
                />
            )}
            topbar={(
                <AdminTopbar
                    user={auth.user}
                    onMenuClick={() => setSidebarOpen(true)}
                    onLogout={() => void handleLogout()}
                />
            )}
        >
            <Outlet />
        </DashboardShell>
    );
}

export function useDashboardWorkspace(): DashboardWorkspaceContext {
    return useOutletContext<DashboardWorkspaceContext>();
}
