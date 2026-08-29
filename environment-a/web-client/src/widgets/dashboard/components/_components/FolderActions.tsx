import clsx from "clsx";
import { RotateCcw, Star, Trash2 } from "lucide-react";
import type { DirectoryRecord } from "@/shared/types/directories";
import type { WorkspaceMode } from "../_types/workspace";

type FolderActionsProps = {
    folder: DirectoryRecord;
    mode: WorkspaceMode;
    onSoftDeleteFolder?: (directoryID: string, name: string) => Promise<void>;
    onToggleFolderStarred?: (directoryID: string, name: string, starred: boolean) => Promise<void>;
    onRestoreFolder?: (directoryID: string, name: string) => Promise<void>;
    onPermanentDeleteFolder?: (directoryID: string, name: string) => Promise<void>;
    className?: string;
};

export function FolderActions({
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
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-brand-steel hover:bg-brand-sky hover:text-brand-logoBlue"
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
                            folder.starred_at ? "text-brand-logoYellow" : "text-brand-steel hover:text-brand-logoBlue"
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
