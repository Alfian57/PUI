import type { DirectoryRecord } from "@/shared/types/directories";
import type { FileRecord } from "@/shared/types/files";
import type { WorkspaceBulkSelection, WorkspaceItem, WorkspaceSortOption } from "../_types/workspace";

export function sortWorkspaceItems(
    folders: DirectoryRecord[],
    files: FileRecord[],
    sortOption: WorkspaceSortOption
): WorkspaceItem[] {
    return groupWorkspaceItems(folders, files).sort((left, right) => compareWorkspaceItems(left, right, sortOption));
}

export function groupWorkspaceItems(folders: DirectoryRecord[], files: FileRecord[]): WorkspaceItem[] {
    return [
        ...folders.map((folder): WorkspaceItem => ({ kind: "folder", folder })),
        ...files.map((file): WorkspaceItem => ({ kind: "file", file }))
    ];
}

export function getItemKey(item: WorkspaceItem): string {
    return item.kind === "folder" ? `folder:${item.folder.id}` : `file:${item.file.id}`;
}

export function toBulkSelection(items: WorkspaceItem[]): WorkspaceBulkSelection {
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
    if (sortOption === "type") return getItemName(left).localeCompare(getItemName(right), "id-ID");
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
