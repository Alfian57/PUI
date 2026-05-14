import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react";
import { FileText, FolderOpen } from "lucide-react";
import { FilePreviewModal } from "@/widgets/dashboard/components/FilePreviewModal";
import { WorkspaceItemsView, type WorkspaceSortOption } from "@/widgets/dashboard/components/WorkspaceItemsView";
import { DriveToolbar, type WorkspaceCustomTimeRange, type WorkspaceTimeFilter } from "@/widgets/dashboard/components/DriveToolbar";
import { StorageSummary } from "@/widgets/dashboard/components/StorageSummary";
import { useDashboardWorkspace } from "@/widgets/dashboard/DashboardLayout";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Button } from "@/shared/ui/Button";
import type { DirectoryRecord, FileRecord } from "@/shared/types/domain";

export function FilesPage(): JSX.Element {
    const [dragActive, setDragActive] = useState(false);
    const [sortOption, setSortOption] = useState<WorkspaceSortOption>("newest");
    const [timeFilter, setTimeFilter] = useState<WorkspaceTimeFilter>("all");
    const [customTimeRange, setCustomTimeRange] = useState<WorkspaceCustomTimeRange>({ from: "", to: "" });
    const emptyUploadInputRef = useRef<HTMLInputElement | null>(null);
    const {
        directories,
        files,
        detailsOpen,
        setDetailsOpen,
        fileModalTab,
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
        onUpload
    } = useDashboardWorkspace();

    const childFolders = directories.directories.filter((directory) => (
        directories.selectedDirectoryID ? directory.parent_id === directories.selectedDirectoryID : !directory.parent_id
    ));
    const filteredChildFolders = useMemo(
        () => filterByTime(childFolders, timeFilter, customTimeRange),
        [childFolders, customTimeRange, timeFilter]
    );
    const filteredFiles = useMemo(
        () => filterByTime(files.files, timeFilter, customTimeRange),
        [customTimeRange, files.files, timeFilter]
    );
    const loadingContent = directories.isLoading || files.filesState.isLoading;
    const locationIsEmpty = !loadingContent && childFolders.length === 0 && files.files.length === 0;
    const filterIsActive = timeFilter !== "all";
    const filteredIsEmpty = !loadingContent && !locationIsEmpty && filteredChildFolders.length === 0 && filteredFiles.length === 0;
    const visibleIsEmpty = locationIsEmpty || filteredIsEmpty;
    const totalItems = filteredChildFolders.length + filteredFiles.length;

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

    async function handleEmptyUploadChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
        const file = event.target.files?.[0];
        if (file) {
            await onUpload(file);
        }
        event.target.value = "";
    }

    return (
        <div
            className="relative space-y-6"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(event) => void handleDrop(event)}
        >
            {dragActive ? (
                <div className="pointer-events-none fixed inset-x-4 bottom-4 top-20 z-30 flex items-center justify-center rounded-[2rem] border-2 border-dashed border-brand-amber bg-white/75 shadow-deck backdrop-blur">
                    <div className="rounded-3xl bg-brand-ink px-6 py-4 text-center text-white shadow-deck">
                        <p className="font-display text-xl font-semibold">Lepaskan file untuk upload</p>
                        <p className="mt-1 text-sm text-white/75">
                            File akan disimpan ke {directories.selectedDirectoryID ? "folder yang sedang dibuka" : "File Saya"}.
                        </p>
                    </div>
                </div>
            ) : null}

            <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="font-display text-3xl font-semibold text-brand-ink">File Saya</h1>
                    <p className="mt-1 text-sm text-brand-steel">
                        Kelola folder, upload file, dan buka kembali file yang sudah tersimpan.
                    </p>
                </div>
            </section>

            <StorageSummary
                totalFiles={files.stats.totalFiles}
                totalBytes={files.stats.totalBytes}
                dedup={files.stats.dedup}
                folderCount={directories.directories.length}
            />

            <section className="grid gap-6">
                <div className="min-w-0">
                    <section className="space-y-6 rounded-[1.75rem] border border-brand-steel/10 bg-white/90 p-4 shadow-soft backdrop-blur sm:p-5">
                        <DriveToolbar
                            directoryID={directories.selectedDirectoryID}
                            uploadDisabled={files.uploadState.isPending}
                            uploadProgress={files.uploadProgress}
                            viewMode={viewMode}
                            sortOption={sortOption}
                            timeFilter={timeFilter}
                            customTimeRange={customTimeRange}
                            onViewModeChange={setViewMode}
                            onSortChange={setSortOption}
                            onTimeFilterChange={setTimeFilter}
                            onCustomTimeRangeChange={setCustomTimeRange}
                            onNavigate={onSelectDirectory}
                            onCreateFolder={onCreateFolder}
                            onUpload={onUpload}
                            embedded
                        />

                        {!visibleIsEmpty ? (
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold text-brand-ink">
                                    {directories.selectedDirectoryID ? "Isi folder" : "Isi File Saya"}
                                </p>
                                <p className="text-xs font-medium text-brand-steel">
                                    {totalItems} item · {filteredChildFolders.length} folder · {filteredFiles.length} file
                                    {filterIsActive ? ` · difilter ${timeFilterLabel(timeFilter)}` : ""}
                                </p>
                            </div>
                        ) : null}

                        {locationIsEmpty ? (
                            <section className="rounded-[1.75rem] border border-dashed border-brand-steel/20 bg-brand-sky/45">
                                <input
                                    ref={emptyUploadInputRef}
                                    type="file"
                                    className="hidden"
                                    onChange={(event) => void handleEmptyUploadChange(event)}
                                />
                                <EmptyState
                                    icon={<FolderOpen className="h-7 w-7" aria-hidden="true" />}
                                    title={directories.selectedDirectoryID ? "Folder ini masih kosong" : "File Saya masih kosong"}
                                    description="Buat folder baru atau upload file pertama ke lokasi ini."
                                    action={(
                                        <div className="flex flex-wrap justify-center gap-2">
                                            <Button onClick={onCreateFolder}>Buat folder</Button>
                                            <Button
                                                variant="secondary"
                                                icon={<FileText className="h-4 w-4" aria-hidden="true" />}
                                                onClick={() => emptyUploadInputRef.current?.click()}
                                            >
                                                Upload file
                                            </Button>
                                        </div>
                                    )}
                                />
                            </section>
                        ) : null}

                        {filteredIsEmpty ? (
                            <section className="rounded-[1.75rem] border border-dashed border-brand-steel/20 bg-brand-sky/45">
                                <EmptyState
                                    icon={<FileText className="h-7 w-7" aria-hidden="true" />}
                                    title="Tidak ada item pada rentang waktu ini"
                                    description="Ubah filter waktu untuk menampilkan item lain di lokasi ini."
                                    action={(
                                        <Button variant="secondary" onClick={() => setTimeFilter("all")}>
                                            Tampilkan semua waktu
                                        </Button>
                                    )}
                                />
                            </section>
                        ) : null}

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

                    </section>
                </div>

                <FilePreviewModal
                    open={detailsOpen}
                    tab={fileModalTab}
                    file={files.fileDetail}
                    lastUploadResult={files.lastUploadResult}
                    loading={files.detailState.isLoading}
                    onTabChange={setFileModalTab}
                    onClose={() => setDetailsOpen(false)}
                    onDownload={onDownload}
                />
            </section>
        </div>
    );
}

function filterByTime<TItem extends DirectoryRecord | FileRecord>(
    items: TItem[],
    filter: WorkspaceTimeFilter,
    customRange: WorkspaceCustomTimeRange
): TItem[] {
    const range = resolveTimeRange(filter, customRange);
    if (!range) return items;

    return items.filter((item) => {
        const createdAt = new Date(item.created_at).getTime();
        return createdAt >= range.from.getTime() && createdAt <= range.to.getTime();
    });
}

function resolveTimeRange(
    filter: WorkspaceTimeFilter,
    customRange: WorkspaceCustomTimeRange
): { from: Date; to: Date } | null {
    if (filter === "all") return null;

    const now = new Date();
    const to = endOfDay(now);
    if (filter === "today") return { from: startOfDay(now), to };
    if (filter === "7d") return { from: startOfDay(daysAgo(6)), to };
    if (filter === "30d") return { from: startOfDay(daysAgo(29)), to };
    if (filter === "month") return { from: new Date(now.getFullYear(), now.getMonth(), 1), to };
    if (filter === "year") return { from: new Date(now.getFullYear(), 0, 1), to };

    const from = customRange.from ? startOfDay(new Date(customRange.from)) : null;
    const customTo = customRange.to ? endOfDay(new Date(customRange.to)) : null;
    if (!from && !customTo) return null;

    return {
        from: from ?? new Date(0),
        to: customTo ?? to
    };
}

function daysAgo(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
}

function startOfDay(date: Date): Date {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    return next;
}

function endOfDay(date: Date): Date {
    const next = new Date(date);
    next.setHours(23, 59, 59, 999);
    return next;
}

function timeFilterLabel(filter: WorkspaceTimeFilter): string {
    if (filter === "today") return "hari ini";
    if (filter === "7d") return "7 hari";
    if (filter === "30d") return "30 hari";
    if (filter === "month") return "bulan ini";
    if (filter === "year") return "tahun ini";
    if (filter === "custom") return "kustom";
    return "semua waktu";
}
