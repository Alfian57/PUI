import clsx from "clsx";
import { Download, FileText, Info, Trash2 } from "lucide-react";
import { EmptyState } from "@/shared/ui/EmptyState";
import { formatBytes, formatDate } from "@/shared/lib/format";
import type { FileRecord } from "@/shared/types/domain";

type FileGridViewProps = {
    files: FileRecord[];
    selectedFileID: string | null;
    loading: boolean;
    onSelect: (fileID: string) => void;
    onOpenDetails: () => void;
    onDownload: (file: FileRecord) => Promise<void>;
    onSoftDelete: (file: FileRecord) => Promise<void>;
};

export function FileGridView({
    files,
    selectedFileID,
    loading,
    onSelect,
    onOpenDetails,
    onDownload,
    onSoftDelete
}: FileGridViewProps): JSX.Element {
    if (loading) {
        return (
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="h-52 rounded-[1.75rem] bg-white p-5 shadow-soft ring-1 ring-brand-line/70">
                        <div className="h-full animate-pulse rounded-2xl bg-gradient-to-r from-white via-brand-sky/70 to-white bg-[length:200%_100%]" />
                    </div>
                ))}
            </section>
        );
    }

    if (files.length === 0) {
        return (
            <div className="rounded-3xl bg-white shadow-soft">
                <EmptyState
                    icon={<FileText className="h-7 w-7" aria-hidden="true" />}
                    title="Belum ada berkas"
                    description="Unggah berkas pertama ke direktori ini agar dapat dikelola dari HashBox."
                />
            </div>
        );
    }

    return (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {files.map((file) => (
                <article
                    key={file.id}
                    className={clsx(
                        "cursor-pointer rounded-[1.75rem] border bg-white p-4 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-deck",
                        selectedFileID === file.id ? "border-brand-ink ring-2 ring-brand-amber/20" : "border-brand-steel/10"
                    )}
                    onClick={() => onSelect(file.id)}
                >
                    <div className="flex h-28 items-center justify-center rounded-3xl bg-brand-sky/75 text-brand-steel">
                        <FileText className="h-10 w-10" aria-hidden="true" />
                    </div>
                    <div className="mt-4 min-w-0">
                        <p className="truncate text-sm font-semibold text-brand-logoBlue">{file.name}</p>
                        <p className="mt-1 text-xs text-brand-steel">{formatBytes(file.size_bytes)}</p>
                        <p className="text-xs text-brand-steel/80">{formatDate(file.created_at)}</p>
                    </div>
                    <div className="mt-4 flex items-center justify-end gap-2">
                        <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-brand-steel hover:bg-brand-sky hover:text-brand-logoBlue"
                            aria-label={`Lihat detail ${file.name}`}
                            title="Detail"
                            onClick={(event) => {
                                event.stopPropagation();
                                onSelect(file.id);
                                onOpenDetails();
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
                            title="Hapus"
                            onClick={(event) => {
                                event.stopPropagation();
                                void onSoftDelete(file);
                            }}
                        >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </div>
                </article>
            ))}
        </section>
    );
}
