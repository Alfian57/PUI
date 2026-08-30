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
            onClick={() => handlers.onOpenFolder(folder.id)}
            className={clsx(
                "grid w-full grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3 gap-y-3 px-3 py-4 text-left transition duration-200 hover:bg-brand-sky/60 sm:px-4 lg:grid-cols-[2.5rem_minmax(0,1.6fr)_8rem_11rem_11rem] lg:items-center",
                "cursor-pointer"
            )}
        >
            <SelectionToggle selected={selected} label={`Pilih ${folder.name}`} onToggle={onToggleSelected} />
            <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-logoYellow/15 text-brand-logoYellow sm:h-10 sm:w-10">
                    <Folder className="h-6 w-6 sm:h-5 sm:w-5" aria-hidden="true" />
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
                className="col-start-2 row-start-2 lg:col-auto lg:row-auto"
            />
        </article>
    );
}
