import type { RefObject } from "react";
import { WorkspaceItemsView } from "@/widgets/dashboard/components/WorkspaceItemsView";
import { DriveToolbar } from "@/widgets/dashboard/components/DriveToolbar";
import { StorageSummary } from "@/widgets/dashboard/components/StorageSummary";
import { useDashboardWorkspace } from "@/widgets/dashboard/hooks/useDashboardWorkspace";
import type { DirectoryRecord } from "@/shared/types/directories";
import type { FileRecord } from "@/shared/types/files";
import type { WorkspaceSortOption } from "@/widgets/dashboard/components/_types/workspace";
import type { WorkspaceCustomTimeRange, WorkspaceTimeFilter } from "@/widgets/dashboard/components/_types/driveToolbar";
import { FilesFilteredEmptyState } from "@/pages/dashboard/files/_components/FilesFilteredEmptyState";
import { FilesLocationEmptyState } from "@/pages/dashboard/files/_components/FilesLocationEmptyState";
import { timeFilterLabel } from "@/pages/dashboard/files/_lib/timeFilter";

type DashboardWorkspace = ReturnType<typeof useDashboardWorkspace>;

type FilesWorkspaceProps = Pick<
    DashboardWorkspace,
    | "directories"
    | "files"
    | "setDetailsOpen"
    | "setFileModalTab"
    | "viewMode"
    | "setViewMode"
    | "onCreateFolder"
    | "onSelectDirectory"
    | "onSelectFile"
    | "onDownload"
    | "onSoftDelete"
    | "onSoftDeleteFolder"
    | "onToggleFileStarred"
    | "onToggleFolderStarred"
    | "onBulkSoftDelete"
    | "onBulkStar"
    | "onBulkUnstar"
    | "onUpload"
> & {
    filteredChildFolders: DirectoryRecord[];
    filteredFiles: FileRecord[];
    loadingContent: boolean;
    locationIsEmpty: boolean;
    filteredIsEmpty: boolean;
    visibleIsEmpty: boolean;
    filterIsActive: boolean;
    totalItems: number;
    totalFiles: number;
    sortOption: WorkspaceSortOption;
    timeFilter: WorkspaceTimeFilter;
    customTimeRange: WorkspaceCustomTimeRange;
    emptyUploadInputRef: RefObject<HTMLInputElement>;
    onTimeFilterChange: (value: WorkspaceTimeFilter) => void;
    onSortChange: (value: WorkspaceSortOption) => void;
    onCustomTimeRangeChange: (value: WorkspaceCustomTimeRange) => void;
    filesHasMore: boolean;
    filesIsFetchingNextPage: boolean;
    filesLoadMoreRef: (node: HTMLElement | null) => void;
};

export function FilesWorkspace({
    directories,
    files,
    setDetailsOpen,
    setFileModalTab,
    viewMode,
    setViewMode,
    onCreateFolder,
    onSelectDirectory,
    onSelectFile,
    onDownload,
    onSoftDelete,
    onSoftDeleteFolder,
    onToggleFileStarred,
    onToggleFolderStarred,
    onBulkSoftDelete,
    onBulkStar,
    onBulkUnstar,
    onUpload,
    filteredChildFolders,
    filteredFiles,
    loadingContent,
    locationIsEmpty,
    filteredIsEmpty,
    visibleIsEmpty,
    filterIsActive,
    totalItems,
    totalFiles,
    sortOption,
    timeFilter,
    customTimeRange,
    emptyUploadInputRef,
    onTimeFilterChange,
    onSortChange,
    onCustomTimeRangeChange,
    filesHasMore,
    filesIsFetchingNextPage,
    filesLoadMoreRef
}: FilesWorkspaceProps): JSX.Element {
    return (
        <>
            <div data-tour="files-summary">
                <StorageSummary
                    totalFiles={files.stats.totalFiles}
                    totalBytes={files.stats.totalBytes}
                    dedup={files.stats.dedup}
                    folderCount={directories.directories.length}
                />
            </div>

            <section className="grid gap-6">
                <div className="min-w-0">
                    <section
                        className="space-y-6 rounded-[1.75rem] bg-white p-5 shadow-soft ring-1 ring-brand-line/70 sm:p-6"
                        data-tour="files-workspace"
                    >
                        <div data-tour="files-toolbar">
                            <DriveToolbar
                                directoryID={directories.selectedDirectoryID}
                                directories={directories.directories}
                                uploadDisabled={files.uploadState.isPending}
                                uploadProgress={files.uploadProgress}
                                viewMode={viewMode}
                                sortOption={sortOption}
                                timeFilter={timeFilter}
                                customTimeRange={customTimeRange}
                                onViewModeChange={setViewMode}
                                onSortChange={onSortChange}
                                onTimeFilterChange={onTimeFilterChange}
                                onCustomTimeRangeChange={onCustomTimeRangeChange}
                                onNavigate={onSelectDirectory}
                                onCreateFolder={onCreateFolder}
                                onUpload={onUpload}
                                embedded
                            />
                        </div>

                        {!visibleIsEmpty ? (
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold text-brand-logoBlue">
                                    {directories.selectedDirectoryID ? "Isi direktori" : "Isi Berkas Saya"}
                                </p>
                                <p className="text-xs font-medium text-brand-steel">
                                    {totalItems} item · {filteredChildFolders.length} direktori · {totalFiles} berkas
                                    {filterIsActive ? " · difilter " + timeFilterLabel(timeFilter) : ""}
                                </p>
                            </div>
                        ) : null}

                        {locationIsEmpty ? (
                            <FilesLocationEmptyState
                                selectedDirectoryID={directories.selectedDirectoryID}
                                inputRef={emptyUploadInputRef}
                                onCreateFolder={onCreateFolder}
                                onUpload={onUpload}
                            />
                        ) : null}

                        {filteredIsEmpty ? <FilesFilteredEmptyState onClearFilter={() => onTimeFilterChange("all")} /> : null}

                        {!visibleIsEmpty ? (
                            <WorkspaceItemsView
                                folders={filteredChildFolders}
                                files={filteredFiles}
                                selectedFileID={files.selectedFileID}
                                loading={loadingContent}
                                viewMode={viewMode}
                                onOpenFolder={onSelectDirectory}
                                onSelectFile={onSelectFile}
                                onOpenDetails={() => {
                                    setFileModalTab("detail");
                                    setDetailsOpen(true);
                                }}
                                onDownload={onDownload}
                                onSoftDelete={onSoftDelete}
                                onSoftDeleteFolder={onSoftDeleteFolder}
                                onToggleFileStarred={onToggleFileStarred}
                                onToggleFolderStarred={onToggleFolderStarred}
                                onBulkSoftDelete={onBulkSoftDelete}
                                onBulkStar={onBulkStar}
                                onBulkUnstar={onBulkUnstar}
                                sortOption={sortOption}
                            />
                        ) : null}

                        {!visibleIsEmpty && filesHasMore ? (
                            <div className="flex flex-col items-center gap-3 pt-2">
                                <div ref={filesLoadMoreRef} className="h-1 w-full" aria-hidden="true" />
                                <button
                                    type="button"
                                    disabled={filesIsFetchingNextPage}
                                    onClick={() => void files.loadMoreFiles()}
                                    className="rounded-2xl border border-brand-steel/20 px-4 py-2 text-sm font-semibold text-brand-steel transition hover:bg-brand-sky disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    {filesIsFetchingNextPage ? "Memuat..." : "Muat lebih banyak berkas"}
                                </button>
                            </div>
                        ) : null}
                    </section>
                </div>

            </section>
        </>
    );
}
