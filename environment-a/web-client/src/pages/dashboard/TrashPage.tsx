import { useQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { getTrash } from "@/features/workspace/api/workspaceApi";
import { WorkspaceItemsView } from "@/widgets/dashboard/components/WorkspaceItemsView";
import { useDashboardWorkspace } from "@/widgets/dashboard/DashboardLayout";
import { queryKeys } from "@/shared/lib/queryKeys";
import { EmptyState } from "@/shared/ui/EmptyState";

export function TrashPage(): JSX.Element {
    const {
        files,
        viewMode,
        onSelectDirectory,
        onSelectFile,
        onDownload,
        onRestoreFile,
        onRestoreFolder,
        onPermanentDeleteFile,
        onPermanentDeleteFolder,
        onBulkRestore,
        onBulkPermanentDelete
    } = useDashboardWorkspace();
    const trashQuery = useQuery({
        queryKey: queryKeys.workspace.trash,
        queryFn: getTrash
    });
    const folders = trashQuery.data?.directories ?? [];
    const trashedFiles = trashQuery.data?.files ?? [];
    const isEmpty = !trashQuery.isLoading && folders.length === 0 && trashedFiles.length === 0;

    return (
        <div className="space-y-5">
            <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="font-display text-3xl font-semibold text-brand-ink">Sampah</h1>
                    <p className="mt-1 text-sm text-brand-steel">
                        Pulihkan item yang masih dibutuhkan atau hapus permanen jika sudah tidak diperlukan.
                    </p>
                </div>
                <p className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-brand-steel shadow-soft">
                    {folders.length + trashedFiles.length} item
                </p>
            </section>

            <section className="rounded-[1.75rem] border border-brand-steel/10 bg-white/90 p-4 shadow-soft backdrop-blur sm:p-5">
                {isEmpty ? (
                    <EmptyState
                        icon={<Trash2 className="h-7 w-7" aria-hidden="true" />}
                        title="Sampah kosong"
                        description="Folder atau file yang dihapus akan muncul di sini sebelum dihapus permanen."
                    />
                ) : (
                    <WorkspaceItemsView
                        folders={folders}
                        files={trashedFiles}
                        selectedFileID={files.selectedFileID}
                        loading={trashQuery.isLoading}
                        viewMode={viewMode}
                        onOpenFolder={onSelectDirectory}
                        onSelectFile={onSelectFile}
                        onDownload={onDownload}
                        onRestoreFile={onRestoreFile}
                        onRestoreFolder={onRestoreFolder}
                        onPermanentDeleteFile={onPermanentDeleteFile}
                        onPermanentDeleteFolder={onPermanentDeleteFolder}
                        onBulkRestore={onBulkRestore}
                        onBulkPermanentDelete={onBulkPermanentDelete}
                        mode="trash"
                    />
                )}
            </section>
        </div>
    );
}
