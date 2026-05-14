import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Download, FileText, Folder, Info, RotateCcw, Star, StarOff, Trash2 } from "lucide-react";
import { formatBytes, formatDate } from "@/shared/lib/format";
import type { DirectoryRecord, FileRecord } from "@/shared/types/domain";

export type WorkspaceSortOption = "newest" | "oldest" | "name-asc" | "name-desc" | "type" | "starred";
export type WorkspaceBulkSelection = {
    folders: DirectoryRecord[];
    files: FileRecord[];
};

type WorkspaceItemsViewProps = {
    folders: DirectoryRecord[];
    files: FileRecord[];
    selectedFileID: string | null;
    loading: boolean;
    viewMode: "list" | "grid";
    onOpenFolder: (directoryID: string) => void;
    onSelectFile: (fileID: string) => void;
    onOpenDetails?: () => void;
    onDownload: (file: FileRecord) => Promise<void>;
    onSoftDelete?: (file: FileRecord) => Promise<void>;
    onSoftDeleteFolder?: (directoryID: string, name: string) => Promise<void>;
    onToggleFileStarred?: (file: FileRecord) => Promise<void>;
    onToggleFolderStarred?: (directoryID: string, name: string, starred: boolean) => Promise<void>;
    onRestoreFile?: (file: FileRecord) => Promise<void>;
    onRestoreFolder?: (directoryID: string, name: string) => Promise<void>;
    onPermanentDeleteFile?: (file: FileRecord) => Promise<void>;
    onPermanentDeleteFolder?: (directoryID: string, name: string) => Promise<void>;
    onBulkSoftDelete?: (selection: WorkspaceBulkSelection) => Promise<void>;
    onBulkStar?: (selection: WorkspaceBulkSelection) => Promise<void>;
    onBulkUnstar?: (selection: WorkspaceBulkSelection) => Promise<void>;
    onBulkRestore?: (selection: WorkspaceBulkSelection) => Promise<void>;
    onBulkPermanentDelete?: (selection: WorkspaceBulkSelection) => Promise<void>;
    mode?: "normal" | "trash";
    sortOption?: WorkspaceSortOption;
};

type WorkspaceItem =
    | { kind: "folder"; folder: DirectoryRecord }
    | { kind: "file"; file: FileRecord };

export function WorkspaceItemsView({
    folders,
    files,
    selectedFileID,
    loading,
    viewMode,
    onOpenFolder,
    onSelectFile,
    onOpenDetails,
    onDownload,
    onSoftDelete,
    onSoftDeleteFolder,
    onToggleFileStarred,
    onToggleFolderStarred,
    onRestoreFile,
    onRestoreFolder,
    onPermanentDeleteFile,
    onPermanentDeleteFolder,
    onBulkSoftDelete,
    onBulkStar,
    onBulkUnstar,
    onBulkRestore,
    onBulkPermanentDelete,
    mode = "normal",
    sortOption
}: WorkspaceItemsViewProps): JSX.Element {
    const displayItems = useMemo(
        () => sortOption ? sortWorkspaceItems(folders, files, sortOption) : groupWorkspaceItems(folders, files),
        [files, folders, sortOption]
    );
    const itemKeySignature = displayItems.map(getItemKey).join("|");
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
    const selectedItems = useMemo(() => {
        const selectedSet = new Set(selectedKeys);
        return displayItems.filter((item) => selectedSet.has(getItemKey(item)));
    }, [displayItems, selectedKeys]);
    const selectedSelection = useMemo(() => toBulkSelection(selectedItems), [selectedItems]);
    const selectedCount = selectedItems.length;
    const bulkEnabled = displayItems.length > 0 && (
        Boolean(onBulkSoftDelete) ||
        Boolean(onBulkStar) ||
        Boolean(onBulkUnstar) ||
        Boolean(onBulkRestore) ||
        Boolean(onBulkPermanentDelete)
    );

    useEffect(() => {
        const availableKeys = new Set(displayItems.map(getItemKey));
        setSelectedKeys((current) => current.filter((key) => availableKeys.has(key)));
    }, [itemKeySignature]);

    if (loading) {
        return viewMode === "grid" ? <GridSkeleton /> : <ListSkeleton />;
    }

    function isSelected(item: WorkspaceItem): boolean {
        return selectedKeys.includes(getItemKey(item));
    }

    function toggleSelected(item: WorkspaceItem): void {
        const key = getItemKey(item);
        setSelectedKeys((current) => (
            current.includes(key) ? current.filter((itemKey) => itemKey !== key) : [...current, key]
        ));
    }

    function clearSelection(): void {
        setSelectedKeys([]);
    }

    function toggleSelectAll(): void {
        setSelectedKeys((current) => current.length === displayItems.length ? [] : displayItems.map(getItemKey));
    }

    async function runBulkAction(action: (selection: WorkspaceBulkSelection) => Promise<void>): Promise<void> {
        if (selectedCount === 0) return;
        await action(selectedSelection);
        clearSelection();
    }

    const bulkToolbar = bulkEnabled ? (
        <div className={clsx(
            "mb-3 flex flex-col gap-3 rounded-2xl border border-brand-steel/10 bg-brand-sky/55 px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
            selectedCount > 0 ? "border-brand-amber/40 bg-brand-amber/10" : ""
        )}>
            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="rounded-xl border border-brand-steel/15 bg-white px-3 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-sky"
                >
                    {selectedCount === displayItems.length ? "Batalkan semua" : "Pilih semua"}
                </button>
                <p className="text-sm font-medium text-brand-steel">
                    {selectedCount > 0 ? `${selectedCount} item dipilih` : "Pilih item untuk aksi massal"}
                </p>
            </div>

            {selectedCount > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                    {mode === "trash" ? (
                        <>
                            {onBulkRestore ? (
                                <button
                                    type="button"
                                    onClick={() => void runBulkAction(onBulkRestore)}
                                    className="inline-flex items-center gap-2 rounded-xl bg-brand-ink px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-steel"
                                >
                                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                                    Pulihkan
                                </button>
                            ) : null}
                            {onBulkPermanentDelete ? (
                                <button
                                    type="button"
                                    onClick={() => void runBulkAction(onBulkPermanentDelete)}
                                    className="inline-flex items-center gap-2 rounded-xl border border-brand-coral/25 bg-white px-3 py-2 text-sm font-semibold text-brand-coral transition hover:bg-brand-coral/10"
                                >
                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                    Hapus permanen
                                </button>
                            ) : null}
                        </>
                    ) : (
                        <>
                            {onBulkStar ? (
                                <button
                                    type="button"
                                    onClick={() => void runBulkAction(onBulkStar)}
                                    className="inline-flex items-center gap-2 rounded-xl bg-brand-ink px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-steel"
                                >
                                    <Star className="h-4 w-4" aria-hidden="true" />
                                    Bintangi
                                </button>
                            ) : null}
                            {onBulkUnstar ? (
                                <button
                                    type="button"
                                    onClick={() => void runBulkAction(onBulkUnstar)}
                                    className="inline-flex items-center gap-2 rounded-xl border border-brand-steel/15 bg-white px-3 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-sky"
                                >
                                    <StarOff className="h-4 w-4" aria-hidden="true" />
                                    Hapus bintang
                                </button>
                            ) : null}
                            {onBulkSoftDelete ? (
                                <button
                                    type="button"
                                    onClick={() => void runBulkAction(onBulkSoftDelete)}
                                    className="inline-flex items-center gap-2 rounded-xl border border-brand-coral/25 bg-white px-3 py-2 text-sm font-semibold text-brand-coral transition hover:bg-brand-coral/10"
                                >
                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                    Hapus
                                </button>
                            ) : null}
                        </>
                    )}
                    <button
                        type="button"
                        onClick={clearSelection}
                        className="rounded-xl px-3 py-2 text-sm font-semibold text-brand-steel transition hover:bg-white"
                    >
                        Batal
                    </button>
                </div>
            ) : null}
        </div>
    ) : null;

    if (viewMode === "grid") {
        return (
            <>
                {bulkToolbar}
                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
                    {displayItems.map((item) => item.kind === "folder" ? (
                        <article
                            key={`folder-${item.folder.id}`}
                            onClick={() => {
                                if (mode === "normal") onOpenFolder(item.folder.id);
                            }}
                            className={clsx(
                                "group relative overflow-hidden rounded-[1.4rem] border border-brand-steel/10 bg-brand-sky/55 text-left shadow-soft transition duration-200 hover:border-brand-amber/45 hover:bg-white hover:shadow-deck",
                                mode === "normal" ? "cursor-pointer hover:-translate-y-0.5" : "cursor-default"
                            )}
                        >
                            <SelectionToggle
                                selected={isSelected(item)}
                                label={`Pilih ${item.folder.name}`}
                                onToggle={() => toggleSelected(item)}
                                floating
                            />
                            <div className="flex h-24 items-center justify-center bg-brand-amber/10 text-brand-amber transition group-hover:bg-brand-amber/15">
                                <Folder className="h-10 w-10" aria-hidden="true" />
                            </div>
                            <div className="p-4">
                                <p className="truncate text-sm font-semibold text-brand-ink">{item.folder.name}</p>
                                <p className="mt-1 text-xs text-brand-steel">Direktori · {formatDate(item.folder.created_at)}</p>
                                <FolderActions
                                    folder={item.folder}
                                    mode={mode}
                                    onSoftDeleteFolder={onSoftDeleteFolder}
                                    onToggleFolderStarred={onToggleFolderStarred}
                                    onRestoreFolder={onRestoreFolder}
                                    onPermanentDeleteFolder={onPermanentDeleteFolder}
                                    className="mt-3 justify-end"
                                />
                            </div>
                        </article>
                    ) : (
                        <article
                            key={`file-${item.file.id}`}
                            className={clsx(
                                "group relative cursor-pointer overflow-hidden rounded-[1.4rem] border bg-white shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-deck",
                                selectedFileID === item.file.id ? "border-brand-ink" : "border-brand-steel/10"
                            )}
                            onClick={() => {
                                if (mode === "normal") onSelectFile(item.file.id);
                            }}
                        >
                            <SelectionToggle
                                selected={isSelected(item)}
                                label={`Pilih ${item.file.name}`}
                                onToggle={() => toggleSelected(item)}
                                floating
                            />
                            <div className="flex h-24 items-center justify-center bg-brand-sky/75 text-brand-steel">
                                <FileText className="h-10 w-10" aria-hidden="true" />
                            </div>
                            <div className="p-4">
                                <p className="truncate text-sm font-semibold text-brand-ink">{item.file.name}</p>
                                <p className="mt-1 text-xs text-brand-steel">{formatBytes(item.file.size_bytes)} · {formatDate(item.file.created_at)}</p>
                                <FileActions
                                    file={item.file}
                                    onSelectFile={onSelectFile}
                                    onOpenDetails={onOpenDetails}
                                    onDownload={onDownload}
                                    onSoftDelete={onSoftDelete}
                                    onToggleFileStarred={onToggleFileStarred}
                                    onRestoreFile={onRestoreFile}
                                    onPermanentDeleteFile={onPermanentDeleteFile}
                                    mode={mode}
                                    className="mt-3 justify-end"
                                />
                            </div>
                        </article>
                    ))}
                </section>
            </>
        );
    }

    return (
        <>
            {bulkToolbar}
            <section className="overflow-hidden rounded-[1.5rem] border border-brand-steel/10 bg-white">
                <div className="grid grid-cols-[2.5rem_minmax(0,1.6fr)_8rem_11rem_11rem] border-b border-brand-steel/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-brand-steel max-lg:hidden">
                    <span aria-hidden="true" />
                    <span>Nama</span>
                    <span>Jenis</span>
                    <span>Tanggal</span>
                    <span>Aksi</span>
                </div>

                <div className="divide-y divide-brand-steel/10">
                    {displayItems.map((item) => item.kind === "folder" ? (
                    <article
                        key={`folder-${item.folder.id}`}
                        onClick={() => {
                            if (mode === "normal") onOpenFolder(item.folder.id);
                        }}
                        className={clsx(
                            "grid w-full gap-3 px-4 py-3 text-left transition duration-200 hover:bg-brand-sky/60 lg:grid-cols-[2.5rem_minmax(0,1.6fr)_8rem_11rem_11rem] lg:items-center",
                            mode === "normal" ? "cursor-pointer" : "cursor-default"
                        )}
                    >
                        <SelectionToggle
                            selected={isSelected(item)}
                            label={`Pilih ${item.folder.name}`}
                            onToggle={() => toggleSelected(item)}
                        />
                        <span className="flex min-w-0 items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-amber/15 text-brand-amber">
                                <Folder className="h-5 w-5" aria-hidden="true" />
                            </span>
                            <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold text-brand-ink">{item.folder.name}</span>
                                <span className="text-xs text-brand-steel lg:hidden">Direktori · {formatDate(item.folder.created_at)}</span>
                            </span>
                        </span>
                        <span className="hidden text-sm text-brand-steel lg:block">Direktori</span>
                        <span className="hidden text-sm text-brand-steel lg:block">{formatDate(item.folder.created_at)}</span>
                        <FolderActions
                            folder={item.folder}
                            mode={mode}
                            onSoftDeleteFolder={onSoftDeleteFolder}
                            onToggleFolderStarred={onToggleFolderStarred}
                            onRestoreFolder={onRestoreFolder}
                            onPermanentDeleteFolder={onPermanentDeleteFolder}
                        />
                    </article>
                ) : (
                    <article
                        key={`file-${item.file.id}`}
                        className={clsx(
                            "group grid cursor-pointer gap-3 px-4 py-3 transition duration-200 hover:bg-brand-sky/60 lg:grid-cols-[2.5rem_minmax(0,1.6fr)_8rem_11rem_11rem] lg:items-center",
                            selectedFileID === item.file.id ? "bg-brand-sky" : ""
                        )}
                        onClick={() => {
                            if (mode === "normal") onSelectFile(item.file.id);
                        }}
                    >
                        <SelectionToggle
                            selected={isSelected(item)}
                            label={`Pilih ${item.file.name}`}
                            onToggle={() => toggleSelected(item)}
                        />
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-mint/70 text-brand-ink">
                                <FileText className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-brand-ink">{item.file.name}</p>
                                <p className="text-xs text-brand-steel lg:hidden">
                                    Berkas · {formatBytes(item.file.size_bytes)} · {formatDate(item.file.created_at)}
                                </p>
                            </div>
                        </div>
                        <p className="hidden text-sm text-brand-steel lg:block">Berkas</p>
                        <p className="hidden text-sm text-brand-steel lg:block">{formatDate(item.file.created_at)}</p>
                        <FileActions
                            file={item.file}
                            onSelectFile={onSelectFile}
                            onOpenDetails={onOpenDetails}
                            onDownload={onDownload}
                            onSoftDelete={onSoftDelete}
                            onToggleFileStarred={onToggleFileStarred}
                            onRestoreFile={onRestoreFile}
                            onPermanentDeleteFile={onPermanentDeleteFile}
                            mode={mode}
                        />
                    </article>
                ))}
                </div>
            </section>
        </>
    );
}

function sortWorkspaceItems(folders: DirectoryRecord[], files: FileRecord[], sortOption: WorkspaceSortOption): WorkspaceItem[] {
    return groupWorkspaceItems(folders, files).sort((left, right) => compareWorkspaceItems(left, right, sortOption));
}

function groupWorkspaceItems(folders: DirectoryRecord[], files: FileRecord[]): WorkspaceItem[] {
    return [
        ...folders.map((folder): WorkspaceItem => ({ kind: "folder", folder })),
        ...files.map((file): WorkspaceItem => ({ kind: "file", file }))
    ];
}

function getItemKey(item: WorkspaceItem): string {
    return item.kind === "folder" ? `folder:${item.folder.id}` : `file:${item.file.id}`;
}

function toBulkSelection(items: WorkspaceItem[]): WorkspaceBulkSelection {
    return items.reduce<WorkspaceBulkSelection>((selection, item) => {
        if (item.kind === "folder") {
            selection.folders.push(item.folder);
        } else {
            selection.files.push(item.file);
        }

        return selection;
    }, { folders: [], files: [] });
}

function compareWorkspaceItems(left: WorkspaceItem, right: WorkspaceItem, sortOption: WorkspaceSortOption): number {
    if (left.kind !== right.kind) {
        return left.kind === "folder" ? -1 : 1;
    }

    if (sortOption === "name-asc") return getItemName(left).localeCompare(getItemName(right), "id-ID");
    if (sortOption === "name-desc") return getItemName(right).localeCompare(getItemName(left), "id-ID");
    if (sortOption === "oldest") return getItemTime(left) - getItemTime(right);
    if (sortOption === "type") {
        return getItemName(left).localeCompare(getItemName(right), "id-ID");
    }
    if (sortOption === "starred") {
        const starredCompare = Number(Boolean(getItemStarredAt(right))) - Number(Boolean(getItemStarredAt(left)));
        return starredCompare || getItemTime(right) - getItemTime(left);
    }
    return getItemTime(right) - getItemTime(left);
}

function getItemName(item: WorkspaceItem): string {
    return item.kind === "folder" ? item.folder.name : item.file.name;
}

function getItemTime(item: WorkspaceItem): number {
    return new Date(item.kind === "folder" ? item.folder.created_at : item.file.created_at).getTime();
}

function getItemStarredAt(item: WorkspaceItem): string | null | undefined {
    return item.kind === "folder" ? item.folder.starred_at : item.file.starred_at;
}

type SelectionToggleProps = {
    selected: boolean;
    label: string;
    onToggle: () => void;
    floating?: boolean;
};

function SelectionToggle({ selected, label, onToggle, floating = false }: SelectionToggleProps): JSX.Element {
    return (
        <button
            type="button"
            aria-label={label}
            aria-pressed={selected}
            onClick={(event) => {
                event.stopPropagation();
                onToggle();
            }}
            className={clsx(
                "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border transition focus:outline-none focus:ring-2 focus:ring-brand-amber/40",
                selected
                    ? "border-brand-ink bg-brand-ink text-white"
                    : "border-brand-steel/15 bg-white text-brand-steel hover:border-brand-amber/45 hover:text-brand-ink",
                floating ? "absolute left-3 top-3 z-10 shadow-soft" : ""
            )}
        >
            <span className={clsx(
                "h-3.5 w-3.5 rounded border transition",
                selected ? "border-white bg-white" : "border-current"
            )} />
        </button>
    );
}

type FileActionsProps = {
    file: FileRecord;
    onSelectFile: (fileID: string) => void;
    onOpenDetails?: () => void;
    onDownload: (file: FileRecord) => Promise<void>;
    onSoftDelete?: (file: FileRecord) => Promise<void>;
    onToggleFileStarred?: (file: FileRecord) => Promise<void>;
    onRestoreFile?: (file: FileRecord) => Promise<void>;
    onPermanentDeleteFile?: (file: FileRecord) => Promise<void>;
    mode: "normal" | "trash";
    className?: string;
};

function FileActions({
    file,
    onSelectFile,
    onOpenDetails,
    onDownload,
    onSoftDelete,
    onToggleFileStarred,
    onRestoreFile,
    onPermanentDeleteFile,
    mode,
    className
}: FileActionsProps): JSX.Element {
    return (
        <div className={clsx("flex min-w-[11rem] items-center justify-start gap-2", className)}>
            {mode === "trash" ? (
                <>
                    <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-brand-steel hover:bg-brand-sky hover:text-brand-ink"
                        aria-label={`Pulihkan ${file.name}`}
                        title="Pulihkan"
                        onClick={(event) => {
                            event.stopPropagation();
                            if (onRestoreFile) void onRestoreFile(file);
                        }}
                    >
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-brand-coral hover:bg-brand-coral/10"
                        aria-label={`Hapus permanen ${file.name}`}
                        title="Hapus permanen"
                        onClick={(event) => {
                            event.stopPropagation();
                            if (onPermanentDeleteFile) void onPermanentDeleteFile(file);
                        }}
                    >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                </>
            ) : (
                <>
                    <button
                        type="button"
                        className={clsx(
                            "inline-flex h-9 w-9 items-center justify-center rounded-xl hover:bg-brand-sky",
                            file.starred_at ? "text-brand-amber" : "text-brand-steel hover:text-brand-ink"
                        )}
                        aria-label={file.starred_at ? `Hapus bintang ${file.name}` : `Beri bintang ${file.name}`}
                        title={file.starred_at ? "Hapus bintang" : "Beri bintang"}
                        onClick={(event) => {
                            event.stopPropagation();
                            if (onToggleFileStarred) void onToggleFileStarred(file);
                        }}
                    >
                        <Star className={clsx("h-4 w-4", file.starred_at ? "fill-current" : "")} aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-brand-steel hover:bg-brand-sky hover:text-brand-ink"
                        aria-label={`Lihat detail ${file.name}`}
                        title="Detail"
                        onClick={(event) => {
                            event.stopPropagation();
                            onSelectFile(file.id);
                            onOpenDetails?.();
                        }}
                    >
                        <Info className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-brand-steel hover:bg-brand-sky hover:text-brand-ink"
                        aria-label={`Unduh ${file.name}`}
                        title="Unduh"
                        onClick={(event) => {
                            event.stopPropagation();
                            void onDownload(file);
                        }}
                    >
                        <Download className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-brand-coral hover:bg-brand-coral/10"
                        aria-label={`Hapus ${file.name}`}
                        title="Pindahkan ke Sampah"
                        onClick={(event) => {
                            event.stopPropagation();
                            if (onSoftDelete) void onSoftDelete(file);
                        }}
                    >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                </>
            )}
        </div>
    );
}

type FolderActionsProps = {
    folder: DirectoryRecord;
    mode: "normal" | "trash";
    onSoftDeleteFolder?: (directoryID: string, name: string) => Promise<void>;
    onToggleFolderStarred?: (directoryID: string, name: string, starred: boolean) => Promise<void>;
    onRestoreFolder?: (directoryID: string, name: string) => Promise<void>;
    onPermanentDeleteFolder?: (directoryID: string, name: string) => Promise<void>;
    className?: string;
};

function FolderActions({
    folder,
    mode,
    onSoftDeleteFolder,
    onToggleFolderStarred,
    onRestoreFolder,
    onPermanentDeleteFolder,
    className
}: FolderActionsProps): JSX.Element {
    return (
        <div className={clsx("flex min-w-[11rem] items-center justify-start gap-2", className)}>
            {mode === "trash" ? (
                <>
                    <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-brand-steel hover:bg-brand-sky hover:text-brand-ink"
                        aria-label={`Pulihkan ${folder.name}`}
                        title="Pulihkan"
                        onClick={(event) => {
                            event.stopPropagation();
                            if (onRestoreFolder) void onRestoreFolder(folder.id, folder.name);
                        }}
                    >
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-brand-coral hover:bg-brand-coral/10"
                        aria-label={`Hapus permanen ${folder.name}`}
                        title="Hapus permanen"
                        onClick={(event) => {
                            event.stopPropagation();
                            if (onPermanentDeleteFolder) void onPermanentDeleteFolder(folder.id, folder.name);
                        }}
                    >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                </>
            ) : (
                <>
                    <button
                        type="button"
                        className={clsx(
                            "inline-flex h-9 w-9 items-center justify-center rounded-xl hover:bg-brand-sky",
                            folder.starred_at ? "text-brand-amber" : "text-brand-steel hover:text-brand-ink"
                        )}
                        aria-label={folder.starred_at ? `Hapus bintang ${folder.name}` : `Beri bintang ${folder.name}`}
                        title={folder.starred_at ? "Hapus bintang" : "Beri bintang"}
                        onClick={(event) => {
                            event.stopPropagation();
                            if (onToggleFolderStarred) {
                                void onToggleFolderStarred(folder.id, folder.name, Boolean(folder.starred_at));
                            }
                        }}
                    >
                        <Star className={clsx("h-4 w-4", folder.starred_at ? "fill-current" : "")} aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-brand-coral hover:bg-brand-coral/10"
                        aria-label={`Hapus ${folder.name}`}
                        title="Pindahkan ke Sampah"
                        onClick={(event) => {
                            event.stopPropagation();
                            if (onSoftDeleteFolder) void onSoftDeleteFolder(folder.id, folder.name);
                        }}
                    >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                </>
            )}
        </div>
    );
}

function GridSkeleton(): JSX.Element {
    return (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, index) => (
                <div key={index} className="h-40 rounded-[1.4rem] border border-brand-steel/10 bg-white p-4 shadow-soft">
                    <div className="h-full animate-pulse rounded-2xl bg-gradient-to-r from-white via-brand-sky/70 to-white bg-[length:200%_100%]" />
                </div>
            ))}
        </section>
    );
}

function ListSkeleton(): JSX.Element {
    return (
        <section className="overflow-hidden rounded-[1.5rem] border border-brand-steel/10 bg-white">
            {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="border-b border-brand-steel/10 px-4 py-3 last:border-b-0">
                    <div className="h-11 animate-pulse rounded-2xl bg-gradient-to-r from-white via-brand-sky/70 to-white bg-[length:200%_100%]" />
                </div>
            ))}
        </section>
    );
}
