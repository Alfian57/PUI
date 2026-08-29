import clsx from "clsx";
import { Folder } from "lucide-react";
import { formatDate } from "@/shared/lib/format";
import type { DirectoryRecord } from "@/shared/types/directories";
import type { WorkspaceInteractionHandlers, WorkspaceMode } from "../_types/workspace";
import { FolderActions } from "./FolderActions";
import { SelectionToggle } from "./SelectionToggle";

type WorkspaceFolderRowProps = WorkspaceInteractionHandlers & {
    folder: DirectoryRecord;
    mode: WorkspaceMode;
    selected: boolean;
    onToggleSelected: () => void;
};

export function WorkspaceFolderRow({
    folder,
    mode,
    selected,
    onToggleSelected,
    ...handlers
}: WorkspaceFolderRowProps): JSX.Element {
    return (
        <article
            onClick={() => {
                if (mode === "normal") handlers.onOpenFolder(folder.id);
            }}
            className={clsx(
                "grid w-full gap-3 px-4 py-3 text-left transition duration-200 hover:bg-brand-sky/60 lg:grid-cols-[2.5rem_minmax(0,1.6fr)_8rem_11rem_11rem] lg:items-center",
                mode === "normal" ? "cursor-pointer" : "cursor-default"
            )}
        >
            <SelectionToggle selected={selected} label={`Pilih ${folder.name}`} onToggle={onToggleSelected} />
            <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-logoYellow/15 text-brand-logoYellow">
                    <Folder className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-brand-logoBlue">{folder.name}</span>
                    <span className="text-xs text-brand-steel lg:hidden">Direktori · {formatDate(folder.created_at)}</span>
                </span>
            </span>
            <span className="hidden text-sm text-brand-steel lg:block">Direktori</span>
            <span className="hidden text-sm text-brand-steel lg:block">{formatDate(folder.created_at)}</span>
            <FolderActions
                folder={folder}
                mode={mode}
                onSoftDeleteFolder={handlers.onSoftDeleteFolder}
                onToggleFolderStarred={handlers.onToggleFolderStarred}
                onRestoreFolder={handlers.onRestoreFolder}
                onPermanentDeleteFolder={handlers.onPermanentDeleteFolder}
            />
        </article>
    );
}
