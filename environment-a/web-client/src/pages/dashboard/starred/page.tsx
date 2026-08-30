import { useCallback } from "react";
import { generatePath, useNavigate } from "react-router-dom";
import { Star } from "lucide-react";
import { useWorkspaceCollection } from "@/pages/dashboard/_hooks/useWorkspaceCollection";
import { WorkspaceItemsView } from "@/widgets/dashboard/components/WorkspaceItemsView";
import { useDashboardWorkspace } from "@/widgets/dashboard/hooks/useDashboardWorkspace";
import { EmptyState } from "@/components/shared/EmptyState";
import { useInfiniteScroll } from "@/shared/hooks/useInfiniteScroll";
import { ROUTES } from "@/app/routes";

export function StarredPage(): JSX.Element {
    const navigate = useNavigate();
    const {
        files: workspaceFiles,
        viewMode,
        onSelectFile,
        onDownload,
        onSoftDelete,
        onSoftDeleteFolder,
        onToggleFileStarred,
        onToggleFolderStarred,
        onBulkSoftDelete,
        onBulkStar,
        onBulkUnstar
    } = useDashboardWorkspace();
    const starred = useWorkspaceCollection("starred");
    const handleOpenFolder = useCallback((directoryID: string) => {
        navigate(generatePath(ROUTES.app.starredFolderDetail, { folderID: directoryID }));
    }, [navigate]);
    const loadMore = useCallback(() => {
        void starred.loadMore();
    }, [starred.loadMore]);
    const loadMoreRef = useInfiniteScroll({
        hasMore: starred.hasMore,
        isLoading: starred.isLoading || starred.isFetchingNextPage,
        onLoadMore: loadMore
    });
    const isEmpty = !starred.isLoading && !starred.isError && starred.total === 0;

    return (
        <div className="space-y-5">
            <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="font-display text-3xl font-semibold text-brand-logoBlue">Berbintang</h1>
                    <p className="mt-1 text-sm text-brand-steel">
                        Akses cepat untuk direktori dan berkas yang sering Anda buka.
                    </p>
                </div>
                <p className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-brand-steel shadow-soft">
                    {starred.total} item
                </p>
            </section>

            <section className="rounded-[1.75rem] bg-white p-5 shadow-soft ring-1 ring-brand-line/70 sm:p-6">
                {starred.isError ? (
                    <div className="rounded-2xl border border-brand-coral/20 bg-brand-coral/10 px-5 py-8 text-center" role="alert">
                        <p className="font-display text-lg font-semibold text-brand-coral">Item berbintang belum dapat dimuat</p>
                        <p className="mt-1 text-sm text-brand-coral/80">Periksa koneksi lalu coba buka halaman ini kembali.</p>
                    </div>
                ) : isEmpty ? (
                    <EmptyState
                        icon={<Star className="h-7 w-7" aria-hidden="true" />}
                        title="Belum ada item berbintang"
                        description="Beri bintang pada direktori atau berkas penting agar muncul di halaman ini."
                    />
                ) : (
                    <WorkspaceItemsView
                        folders={starred.directories}
                        files={starred.files}
                        selectedFileID={workspaceFiles.selectedFileID}
                        loading={starred.isLoading}
                        viewMode={viewMode}
                        onOpenFolder={handleOpenFolder}
                        onSelectFile={onSelectFile}
                        onDownload={onDownload}
                        onSoftDelete={onSoftDelete}
                        onSoftDeleteFolder={onSoftDeleteFolder}
                        onToggleFileStarred={onToggleFileStarred}
                        onToggleFolderStarred={onToggleFolderStarred}
                        onBulkSoftDelete={onBulkSoftDelete}
                        onBulkStar={onBulkStar}
                        onBulkUnstar={onBulkUnstar}
                    />
                )}
                {!starred.isError && !isEmpty && starred.hasMore ? (
                    <div className="mt-5 flex flex-col items-center gap-3">
                        <div ref={loadMoreRef} className="h-1 w-full" aria-hidden="true" />
                        <button
                            type="button"
                            disabled={starred.isFetchingNextPage}
                            onClick={loadMore}
                            className="rounded-2xl border border-brand-steel/20 px-4 py-2 text-sm font-semibold text-brand-steel transition hover:bg-brand-sky disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {starred.isFetchingNextPage ? "Memuat..." : "Muat lebih banyak"}
                        </button>
                    </div>
                ) : null}
            </section>
        </div>
    );
}
