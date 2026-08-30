import { useCallback } from "react";
import { generatePath, useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { useWorkspaceCollection } from "@/pages/dashboard/_hooks/useWorkspaceCollection";
import { WorkspaceItemsView } from "@/widgets/dashboard/components/WorkspaceItemsView";
import { useDashboardWorkspace } from "@/widgets/dashboard/hooks/useDashboardWorkspace";
import { EmptyState } from "@/components/shared/EmptyState";
import { useInfiniteScroll } from "@/shared/hooks/useInfiniteScroll";
import { ROUTES } from "@/app/routes";

export function TrashPage(): JSX.Element {
    const navigate = useNavigate();
    const {
        files: workspaceFiles,
        viewMode,
        onSelectFile,
        onDownload,
        onRestoreFile,
        onRestoreFolder,
        onPermanentDeleteFile,
        onPermanentDeleteFolder,
        onBulkRestore,
        onBulkPermanentDelete
    } = useDashboardWorkspace();
    const trash = useWorkspaceCollection("trash");
    const handleOpenFolder = useCallback((directoryID: string) => {
        navigate(generatePath(ROUTES.app.trashFolderDetail, { folderID: directoryID }));
    }, [navigate]);
    const loadMore = useCallback(() => {
        void trash.loadMore();
    }, [trash.loadMore]);
    const loadMoreRef = useInfiniteScroll({
        hasMore: trash.hasMore,
        isLoading: trash.isLoading || trash.isFetchingNextPage,
        onLoadMore: loadMore
    });
    const isEmpty = !trash.isLoading && !trash.isError && trash.total === 0;

    return (
        <div className="space-y-5">
            <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="font-display text-3xl font-semibold text-brand-logoBlue">Sampah</h1>
                    <p className="mt-1 text-sm text-brand-steel">
                        Pulihkan item yang masih dibutuhkan atau hapus permanen jika sudah tidak diperlukan.
                    </p>
                </div>
                <p className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-brand-steel shadow-soft">
                    {trash.total} item
                </p>
            </section>

            <section className="rounded-[1.75rem] bg-white p-5 shadow-soft ring-1 ring-brand-line/70 sm:p-6">
                {trash.isError ? (
                    <div className="rounded-2xl border border-brand-coral/20 bg-brand-coral/10 px-5 py-8 text-center" role="alert">
                        <p className="font-display text-lg font-semibold text-brand-coral">Sampah belum dapat dimuat</p>
                        <p className="mt-1 text-sm text-brand-coral/80">Periksa koneksi lalu coba buka halaman ini kembali.</p>
                    </div>
                ) : isEmpty ? (
                    <EmptyState
                        icon={<Trash2 className="h-7 w-7" aria-hidden="true" />}
                        title="Sampah kosong"
                        description="Direktori atau berkas yang dihapus akan muncul di sini sebelum dihapus permanen."
                    />
                ) : (
                    <WorkspaceItemsView
                        folders={trash.directories}
                        files={trash.files}
                        selectedFileID={workspaceFiles.selectedFileID}
                        loading={trash.isLoading}
                        viewMode={viewMode}
                        onOpenFolder={handleOpenFolder}
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
                {!trash.isError && !isEmpty && trash.hasMore ? (
                    <div className="mt-5 flex flex-col items-center gap-3">
                        <div ref={loadMoreRef} className="h-1 w-full" aria-hidden="true" />
                        <button
                            type="button"
                            disabled={trash.isFetchingNextPage}
                            onClick={loadMore}
                            className="rounded-2xl border border-brand-steel/20 px-4 py-2 text-sm font-semibold text-brand-steel transition hover:bg-brand-sky disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {trash.isFetchingNextPage ? "Memuat..." : "Muat lebih banyak"}
                        </button>
                    </div>
                ) : null}
            </section>
        </div>
    );
}
