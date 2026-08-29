import clsx from "clsx";
import { FileText } from "lucide-react";
import { formatBytes, formatDate } from "@/shared/lib/format";
import type { FileRecord } from "@/shared/types/files";
import type { WorkspaceInteractionHandlers, WorkspaceMode } from "../_types/workspace";
import { FileActions } from "./FileActions";
import { SelectionToggle } from "./SelectionToggle";

type WorkspaceFileCardProps = WorkspaceInteractionHandlers & {
    file: FileRecord;
    mode: WorkspaceMode;
    selected: boolean;
    selectedFileID: string | null;
    onToggleSelected: () => void;
};

export function WorkspaceFileCard({
    file,
    mode,
    selected,
    selectedFileID,
    onToggleSelected,
    ...handlers
}: WorkspaceFileCardProps): JSX.Element {
    return (
        <article
            className={clsx(
                "group relative cursor-pointer overflow-hidden rounded-[1.4rem] border bg-white shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-deck",
                selectedFileID === file.id ? "border-brand-ink" : "border-brand-steel/10"
            )}
            onClick={() => {
                if (mode === "normal") handlers.onSelectFile(file.id);
            }}
        >
            <SelectionToggle selected={selected} label={`Pilih ${file.name}`} onToggle={onToggleSelected} floating />
            <div className="flex h-24 items-center justify-center bg-brand-sky/75 text-brand-steel">
                <FileText className="h-10 w-10" aria-hidden="true" />
            </div>
            <div className="p-4">
                <p className="truncate text-sm font-semibold text-brand-logoBlue">{file.name}</p>
                <p className="mt-1 text-xs text-brand-steel">{formatBytes(file.size_bytes)} · {formatDate(file.created_at)}</p>
                <FileActions
                    file={file}
                    onSelectFile={handlers.onSelectFile}
                    onOpenDetails={handlers.onOpenDetails}
                    onDownload={handlers.onDownload}
                    onSoftDelete={handlers.onSoftDelete}
                    onToggleFileStarred={handlers.onToggleFileStarred}
                    onRestoreFile={handlers.onRestoreFile}
                    onPermanentDeleteFile={handlers.onPermanentDeleteFile}
                    mode={mode}
                    className="mt-3 justify-end"
                />
            </div>
        </article>
    );
}
