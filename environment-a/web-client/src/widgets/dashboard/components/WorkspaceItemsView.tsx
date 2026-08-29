import { useEffect, useMemo, useState } from "react";
import type { DirectoryRecord } from "@/shared/types/directories";
import type { FileRecord } from "@/shared/types/files";
import { GridSkeleton } from "./_components/GridSkeleton";
import { ListSkeleton } from "./_components/ListSkeleton";
import { WorkspaceBulkToolbar } from "./_components/WorkspaceBulkToolbar";
import { WorkspaceGrid } from "./_components/WorkspaceGrid";
import { WorkspaceList } from "./_components/WorkspaceList";
import { getItemKey, groupWorkspaceItems, sortWorkspaceItems, toBulkSelection } from "./_lib/workspaceItems";
import type {
    WorkspaceBulkSelection,
    WorkspaceInteractionHandlers,
    WorkspaceItem,
    WorkspaceMode,
    WorkspaceSortOption
} from "./_types/workspace";

type WorkspaceItemsViewProps = WorkspaceInteractionHandlers & {
    folders: DirectoryRecord[];
    files: FileRecord[];
    selectedFileID: string | null;
    loading: boolean;
    viewMode: "list" | "grid";
    onBulkSoftDelete?: (selection: WorkspaceBulkSelection) => Promise<void>;
    onBulkStar?: (selection: WorkspaceBulkSelection) => Promise<void>;
    onBulkUnstar?: (selection: WorkspaceBulkSelection) => Promise<void>;
    onBulkRestore?: (selection: WorkspaceBulkSelection) => Promise<void>;
    onBulkPermanentDelete?: (selection: WorkspaceBulkSelection) => Promise<void>;
    mode?: WorkspaceMode;
    sortOption?: WorkspaceSortOption;
};

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
    const itemKeySignature = useMemo(() => displayItems.map(getItemKey).join("|"), [displayItems]);
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
    const selectedKeySet = useMemo(() => new Set(selectedKeys), [selectedKeys]);
    const selectedItems = useMemo(() => {
        return displayItems.filter((item) => selectedKeySet.has(getItemKey(item)));
    }, [displayItems, selectedKeySet]);
    const selectedSelection = useMemo(() => toBulkSelection(selectedItems), [selectedItems]);
    const selectedCount = selectedItems.length;
    const bulkEnabled = displayItems.length > 0 && (
        Boolean(onBulkSoftDelete)
        || Boolean(onBulkStar)
        || Boolean(onBulkUnstar)
        || Boolean(onBulkRestore)
        || Boolean(onBulkPermanentDelete)
    );
    const handlers: WorkspaceInteractionHandlers = {
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
        onPermanentDeleteFolder
    };

    useEffect(() => {
        const availableKeys = new Set(displayItems.map(getItemKey));
        setSelectedKeys((current) => current.filter((key) => availableKeys.has(key)));
    }, [itemKeySignature]);

    if (loading) {
        return viewMode === "grid" ? <GridSkeleton /> : <ListSkeleton />;
    }

    function isSelected(item: WorkspaceItem): boolean {
        return selectedKeySet.has(getItemKey(item));
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
        <WorkspaceBulkToolbar
            mode={mode}
            selectedCount={selectedCount}
            totalCount={displayItems.length}
            onToggleSelectAll={toggleSelectAll}
            onRunBulkAction={runBulkAction}
            onBulkSoftDelete={onBulkSoftDelete}
            onBulkStar={onBulkStar}
            onBulkUnstar={onBulkUnstar}
            onBulkRestore={onBulkRestore}
            onBulkPermanentDelete={onBulkPermanentDelete}
            onClearSelection={clearSelection}
        />
    ) : null;

    return (
        <>
            {bulkToolbar}
            {viewMode === "grid" ? (
                <WorkspaceGrid
                    items={displayItems}
                    selectedFileID={selectedFileID}
                    mode={mode}
                    isSelected={isSelected}
                    onToggleSelected={toggleSelected}
                    {...handlers}
                />
            ) : (
                <WorkspaceList
                    items={displayItems}
                    selectedFileID={selectedFileID}
                    mode={mode}
                    isSelected={isSelected}
                    onToggleSelected={toggleSelected}
                    {...handlers}
                />
            )}
        </>
    );
}
