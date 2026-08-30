import { useCallback, useMemo, useRef, useState, type DragEvent } from "react";
import { FilesDropOverlay } from "@/pages/dashboard/files/_components/FilesDropOverlay";
import { FilesWorkspace } from "@/pages/dashboard/files/_components/FilesWorkspace";
import { filterByTime } from "@/pages/dashboard/files/_lib/timeFilter";
import { useDashboardWorkspace } from "@/widgets/dashboard/hooks/useDashboardWorkspace";
import type { WorkspaceCustomTimeRange } from "@/widgets/dashboard/components/_types/driveToolbar";
import { useInfiniteScroll } from "@/shared/hooks/useInfiniteScroll";

export function FilesPage(): JSX.Element {
    const [dragActive, setDragActive] = useState(false);
    const emptyUploadInputRef = useRef<HTMLInputElement | null>(null);
    const workspace = useDashboardWorkspace();
    const {
        directories,
        files,
        onUpload
    } = workspace;
    const {
        sortOption,
        setSortOption,
        timeFilter,
        setTimeFilter,
        customTimeRange,
        setCustomTimeRange
    } = files;

    const childFolders = directories.directories.filter((directory) => (
        directories.selectedDirectoryID
            ? directory.parent_id === directories.selectedDirectoryID
            : !directory.parent_id
    ));
    const filteredChildFolders = useMemo(
        () => filterByTime(childFolders, timeFilter, customTimeRange),
        [childFolders, customTimeRange, timeFilter]
    );
    const filteredFiles = files.files;
    const loadingContent = directories.isLoading
        || !directories.isDirectorySelectionReady
        || files.filesState.isLoading;
    const locationIsEmpty = !loadingContent && childFolders.length === 0 && files.filesTotal === 0;
    const filterIsActive = timeFilter !== "all";
    const filteredIsEmpty = !loadingContent
        && !locationIsEmpty
        && filteredChildFolders.length === 0
        && files.filesTotal === 0;
    const visibleIsEmpty = locationIsEmpty || filteredIsEmpty;
    const totalItems = filteredChildFolders.length + files.filesTotal;

    const handleCustomTimeRangeChange = useCallback((value: WorkspaceCustomTimeRange) => {
        setCustomTimeRange(value);
    }, [setCustomTimeRange]);

    const loadMoreFiles = useCallback(() => {
        void files.loadMoreFiles();
    }, [files.loadMoreFiles]);
    const loadMoreFilesRef = useInfiniteScroll({
        hasMore: files.filesHasMore,
        isLoading: files.filesState.isLoading || files.filesIsFetchingNextPage,
        onLoadMore: loadMoreFiles
    });

    function handleDragOver(event: DragEvent<HTMLDivElement>): void {
        event.preventDefault();
        if (event.dataTransfer.types.includes("Files")) {
            setDragActive(true);
        }
    }

    function handleDragLeave(event: DragEvent<HTMLDivElement>): void {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setDragActive(false);
        }
    }

    async function handleDrop(event: DragEvent<HTMLDivElement>): Promise<void> {
        event.preventDefault();
        setDragActive(false);
        const file = event.dataTransfer.files.item(0);
        if (file) {
            await onUpload(file);
        }
    }

    return (
        <div
            className="relative space-y-6"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(event) => void handleDrop(event)}
        >
            {dragActive ? <FilesDropOverlay selectedDirectoryID={directories.selectedDirectoryID} /> : null}

            <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between" data-tour="files-header">
                <div>
                    <h1 className="font-display text-3xl font-semibold text-brand-logoBlue">Berkas Saya</h1>
                    <p className="mt-1 text-sm text-brand-steel">
                        Kelola direktori, unggah berkas, dan buka kembali berkas yang sudah tersimpan.
                    </p>
                </div>
            </section>

            <FilesWorkspace
                {...workspace}
                filteredChildFolders={filteredChildFolders}
                filteredFiles={filteredFiles}
                loadingContent={loadingContent}
                locationIsEmpty={locationIsEmpty}
                filteredIsEmpty={filteredIsEmpty}
                visibleIsEmpty={visibleIsEmpty}
                filterIsActive={filterIsActive}
                totalItems={totalItems}
                totalFiles={files.filesTotal}
                sortOption={sortOption}
                timeFilter={timeFilter}
                customTimeRange={customTimeRange}
                emptyUploadInputRef={emptyUploadInputRef}
                onTimeFilterChange={setTimeFilter}
                onSortChange={setSortOption}
                onCustomTimeRangeChange={handleCustomTimeRangeChange}
                filesHasMore={files.filesHasMore}
                filesIsFetchingNextPage={files.filesIsFetchingNextPage}
                filesLoadMoreRef={loadMoreFilesRef}
            />
        </div>
    );
}
