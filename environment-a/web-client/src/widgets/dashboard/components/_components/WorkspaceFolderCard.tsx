import clsx from "clsx";
import { Folder } from "lucide-react";
import { formatDate } from "@/shared/lib/format";
import type { DirectoryRecord } from "@/shared/types/directories";
import type { WorkspaceInteractionHandlers, WorkspaceMode } from "../_types/workspace";
import { FolderActions } from "./FolderActions";
import { SelectionToggle } from "./SelectionToggle";

type WorkspaceFolderCardProps = WorkspaceInteractionHandlers & {
    folder: DirectoryRecord;
    mode: WorkspaceMode;
    selected: boolean;
    onToggleSelected: () => void;
};

export function WorkspaceFolderCard({
    folder,
    mode,
    selected,
    onToggleSelected,
    ...handlers
}: WorkspaceFolderCardProps): JSX.Element {
    return (
        <article
            onClick={() => handlers.onOpenFolder(folder.id)}
            className={clsx(
                "group relative flex aspect-square min-h-0 flex-col overflow-hidden rounded-[1.4rem] bg-brand-sky/70 text-left shadow-soft ring-1 ring-brand-line/70 transition duration-200 hover:border-brand-logoYellow/45 hover:bg-white hover:shadow-deck",
                "cursor-pointer hover:-translate-y-0.5"
            )}
        >
            <SelectionToggle selected={selected} label={`Pilih ${folder.name}`} onToggle={onToggleSelected} floating />
            <div className="flex min-h-0 flex-1 items-center justify-center bg-brand-logoYellow/10 text-brand-logoYellow transition group-hover:bg-brand-logoYellow/15">
                <Folder className="h-10 w-10" aria-hidden="true" />
            </div>
            <div className="p-4">
                <p className="truncate text-sm font-semibold text-brand-logoBlue">{folder.name}</p>
                <p className="mt-1 text-xs text-brand-steel">Direktori · {formatDate(folder.created_at)}</p>
                <FolderActions
                    folder={folder}
                    mode={mode}
                    onSoftDeleteFolder={handlers.onSoftDeleteFolder}
                    onToggleFolderStarred={handlers.onToggleFolderStarred}
                    onRestoreFolder={handlers.onRestoreFolder}
                    onPermanentDeleteFolder={handlers.onPermanentDeleteFolder}
                    className="mt-3 justify-end"
                />
            </div>
        </article>
    );
}
