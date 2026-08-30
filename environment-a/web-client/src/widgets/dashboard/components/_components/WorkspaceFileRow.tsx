import clsx from "clsx";
import { FileText } from "lucide-react";
import { formatBytes, formatDate } from "@/shared/lib/format";
import type { FileRecord } from "@/shared/types/files";
import type { WorkspaceInteractionHandlers, WorkspaceMode } from "../_types/workspace";
import { FileActions } from "./FileActions";
import { SelectionToggle } from "./SelectionToggle";

type WorkspaceFileRowProps = WorkspaceInteractionHandlers & {
    file: FileRecord;
    mode: WorkspaceMode;
    selected: boolean;
    selectedFileID: string | null;
    onToggleSelected: () => void;
};

export function WorkspaceFileRow({
    file,
    mode,
    selected,
    selectedFileID,
    onToggleSelected,
    ...handlers
}: WorkspaceFileRowProps): JSX.Element {
    return (
        <article
            className={clsx(
                "group grid cursor-pointer grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3 gap-y-3 px-3 py-4 transition duration-200 hover:bg-brand-sky/60 sm:px-4 lg:grid-cols-[2.5rem_minmax(0,1.6fr)_8rem_11rem_11rem] lg:items-center",
                selectedFileID === file.id ? "bg-brand-sky" : ""
            )}
            onClick={() => {
                handlers.onSelectFile(file.id);
            }}
        >
            <SelectionToggle selected={selected} label={`Pilih ${file.name}`} onToggle={onToggleSelected} />
            <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-mint/70 text-brand-logoBlue sm:h-10 sm:w-10">
                    <FileText className="h-6 w-6 sm:h-5 sm:w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-brand-logoBlue">{file.name}</p>
                    <p className="text-xs text-brand-steel lg:hidden">
                        Berkas · {formatBytes(file.size_bytes)} · {formatDate(file.created_at)}
                    </p>
                </div>
            </div>
            <p className="hidden text-sm text-brand-steel lg:block">Berkas</p>
            <p className="hidden text-sm text-brand-steel lg:block">{formatDate(file.created_at)}</p>
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
                className="col-start-2 row-start-2 lg:col-auto lg:row-auto"
            />
        </article>
    );
}
