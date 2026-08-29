import { useNoticeCenter } from "@/shared/contexts/useNoticeCenter";
import { useConfirmDialog } from "@/components/shared/useConfirmDialog";
import type { useDirectoryTree } from "@/pages/dashboard/_hooks/useDirectoryTree";
import type { DashboardWorkspaceActionHandlers } from "@/widgets/dashboard/types/dashboardWorkspace";

type DashboardDirectoryActionDependencies = {
    directories: ReturnType<typeof useDirectoryTree>;
    onCreateFolderSuccess?: () => void;
};

type DashboardDirectoryActionHandlers = Pick<
    DashboardWorkspaceActionHandlers,
    | "createFolder"
    | "onSoftDeleteFolder"
    | "onToggleFolderStarred"
    | "onRestoreFolder"
    | "onPermanentDeleteFolder"
>;

export function useDashboardDirectoryActions({
    directories,
    onCreateFolderSuccess
}: DashboardDirectoryActionDependencies): DashboardDirectoryActionHandlers {
    const notice = useNoticeCenter();
    const { confirm } = useConfirmDialog();

    async function createFolder(name: string, parentID: string | null): Promise<void> {
        try {
            await directories.createFolder(name, parentID);
            notice.show({ variant: "success", message: "Direktori baru berhasil dibuat." });
            onCreateFolderSuccess?.();
        } catch (cause) {
            notice.show({
                variant: "error",
                message: cause instanceof Error ? cause.message : "Gagal membuat direktori."
            });
        }
    }

    async function onSoftDeleteFolder(directoryID: string, name: string): Promise<void> {
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

    async function onToggleFolderStarred(directoryID: string, name: string, starred: boolean): Promise<void> {
        const next = !starred;
        try {
            await directories.setStarred(directoryID, next);
            notice.show({ variant: "success", message: next ? `${name} ditambahkan ke Berbintang.` : `${name} dihapus dari Berbintang.` });
        } catch (cause) {
            notice.show({ variant: "error", message: cause instanceof Error ? cause.message : "Gagal mengubah bintang direktori." });
        }
    }

    async function onRestoreFolder(directoryID: string, name: string): Promise<void> {
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

    async function onPermanentDeleteFolder(directoryID: string, name: string): Promise<void> {
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

    return {
        createFolder,
        onSoftDeleteFolder,
        onToggleFolderStarred,
        onRestoreFolder,
        onPermanentDeleteFolder
    };
}
