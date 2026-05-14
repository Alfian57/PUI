import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { getStarred } from "@/features/workspace/api/workspaceApi";
import { WorkspaceItemsView } from "@/widgets/dashboard/components/WorkspaceItemsView";
import { useDashboardWorkspace } from "@/widgets/dashboard/DashboardLayout";
import { queryKeys } from "@/shared/lib/queryKeys";
import { EmptyState } from "@/shared/ui/EmptyState";

export function StarredPage(): JSX.Element {
    const {
        files,
        viewMode,
        onSelectDirectory,
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
    const starredQuery = useQuery({
        queryKey: queryKeys.workspace.starred,
        queryFn: getStarred
    });
    const folders = starredQuery.data?.directories ?? [];
    const starredFiles = starredQuery.data?.files ?? [];
    const isEmpty = !starredQuery.isLoading && folders.length === 0 && starredFiles.length === 0;

    return (
        <div className="space-y-5">
            <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="font-display text-3xl font-semibold text-brand-ink">Berbintang</h1>
                    <p className="mt-1 text-sm text-brand-steel">
                        Akses cepat untuk folder dan file yang sering Anda buka.
                    </p>
                </div>
                <p className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-brand-steel shadow-soft">
                    {folders.length + starredFiles.length} item
                </p>
            </section>

            <section className="rounded-[1.75rem] border border-brand-steel/10 bg-white/90 p-4 shadow-soft backdrop-blur sm:p-5">
                {isEmpty ? (
                    <EmptyState
                        icon={<Star className="h-7 w-7" aria-hidden="true" />}
                        title="Belum ada item berbintang"
                        description="Beri bintang pada folder atau file penting agar muncul di halaman ini."
                    />
                ) : (
                    <WorkspaceItemsView
                        folders={folders}
                        files={starredFiles}
                        selectedFileID={files.selectedFileID}
                        loading={starredQuery.isLoading}
                        viewMode={viewMode}
                        onOpenFolder={onSelectDirectory}
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
            </section>
        </div>
    );
}
