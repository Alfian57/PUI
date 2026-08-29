import clsx from "clsx";
import { Download, Info, RotateCcw, Star, Trash2 } from "lucide-react";
import type { FileRecord } from "@/shared/types/files";
import type { WorkspaceMode } from "../_types/workspace";

type FileActionsProps = {
    file: FileRecord;
    onSelectFile: (fileID: string) => void;
    onOpenDetails?: () => void;
    onDownload: (file: FileRecord) => Promise<void>;
    onSoftDelete?: (file: FileRecord) => Promise<void>;
    onToggleFileStarred?: (file: FileRecord) => Promise<void>;
    onRestoreFile?: (file: FileRecord) => Promise<void>;
    onPermanentDeleteFile?: (file: FileRecord) => Promise<void>;
    mode: WorkspaceMode;
    className?: string;
};

export function FileActions({
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
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-brand-steel hover:bg-brand-sky hover:text-brand-logoBlue"
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
                            file.starred_at ? "text-brand-logoYellow" : "text-brand-steel hover:text-brand-logoBlue"
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
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-brand-steel hover:bg-brand-sky hover:text-brand-logoBlue"
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
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-brand-steel hover:bg-brand-sky hover:text-brand-logoBlue"
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
