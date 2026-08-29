import { useNoticeCenter } from "@/shared/contexts/useNoticeCenter";
import { useConfirmDialog } from "@/components/shared/useConfirmDialog";
import type { useFilesWorkspace } from "@/pages/dashboard/_hooks/useFilesWorkspace";
import type { DashboardWorkspaceActionHandlers } from "@/widgets/dashboard/types/dashboardWorkspace";
import type { FileRecord } from "@/shared/types/files";

const MAX_FILE_SIZE = 512 * 1024 * 1024;

type DashboardFileActionDependencies = {
    files: ReturnType<typeof useFilesWorkspace>;
};

type DashboardFileActionHandlers = Pick<
    DashboardWorkspaceActionHandlers,
    | "onUpload"
    | "onDownload"
    | "onSoftDelete"
    | "onToggleFileStarred"
    | "onRestoreFile"
    | "onPermanentDeleteFile"
>;

export function useDashboardFileActions({
    files
}: DashboardFileActionDependencies): DashboardFileActionHandlers {
    const notice = useNoticeCenter();
    const { confirm } = useConfirmDialog();

    async function onUpload(file: File): Promise<void> {
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

    async function onDownload(file: FileRecord): Promise<void> {
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

    async function onSoftDelete(file: FileRecord): Promise<void> {
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

    async function onToggleFileStarred(file: FileRecord): Promise<void> {
        const next = !file.starred_at;
        try {
            await files.setStarred(file.id, next);
            notice.show({ variant: "success", message: next ? `${file.name} ditambahkan ke Berbintang.` : `${file.name} dihapus dari Berbintang.` });
        } catch (cause) {
            notice.show({ variant: "error", message: cause instanceof Error ? cause.message : "Gagal mengubah bintang berkas." });
        }
    }

    async function onRestoreFile(file: FileRecord): Promise<void> {
        try {
            await files.restore(file.id);
            notice.show({ variant: "success", message: `${file.name} dipulihkan.` });
        } catch (cause) {
            notice.show({ variant: "error", message: cause instanceof Error ? cause.message : "Pulihkan berkas gagal." });
        }
    }

    async function onPermanentDeleteFile(file: FileRecord): Promise<void> {
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

    return {
        onUpload,
        onDownload,
        onSoftDelete,
        onToggleFileStarred,
        onRestoreFile,
        onPermanentDeleteFile
    };
}
