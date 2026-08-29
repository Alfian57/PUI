import { useNoticeCenter } from "@/shared/contexts/useNoticeCenter";
import { useConfirmDialog } from "@/components/shared/useConfirmDialog";
import type { useDirectoryTree } from "@/pages/dashboard/_hooks/useDirectoryTree";
import type { useFilesWorkspace } from "@/pages/dashboard/_hooks/useFilesWorkspace";
import type { DashboardWorkspaceActionHandlers, WorkspaceBulkSelection } from "@/widgets/dashboard/types/dashboardWorkspace";

type DashboardBulkActionDependencies = {
    directories: ReturnType<typeof useDirectoryTree>;
    files: ReturnType<typeof useFilesWorkspace>;
};

type DashboardBulkActionHandlers = Pick<
    DashboardWorkspaceActionHandlers,
    | "onBulkSoftDelete"
    | "onBulkStar"
    | "onBulkUnstar"
    | "onBulkRestore"
    | "onBulkPermanentDelete"
>;

export function useDashboardBulkActions({
    directories,
    files
}: DashboardBulkActionDependencies): DashboardBulkActionHandlers {
    const notice = useNoticeCenter();
    const { confirm } = useConfirmDialog();

    async function onBulkSoftDelete(selection: WorkspaceBulkSelection): Promise<void> {
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

    async function onBulkStar(selection: WorkspaceBulkSelection): Promise<void> {
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

    async function onBulkUnstar(selection: WorkspaceBulkSelection): Promise<void> {
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

    async function onBulkRestore(selection: WorkspaceBulkSelection): Promise<void> {
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

    async function onBulkPermanentDelete(selection: WorkspaceBulkSelection): Promise<void> {
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

    return {
        onBulkSoftDelete,
        onBulkStar,
        onBulkUnstar,
        onBulkRestore,
        onBulkPermanentDelete
    };
}
