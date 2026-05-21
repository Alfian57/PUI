import clsx from "clsx";
import { Download, FileText, Info, Trash2 } from "lucide-react";
import { EmptyState } from "@/shared/ui/EmptyState";
import { formatBytes, formatDate } from "@/shared/lib/format";
import type { FileRecord } from "@/shared/types/domain";

type FileListViewProps = {
    files: FileRecord[];
    selectedFileID: string | null;
    loading: boolean;
    onSelect: (fileID: string) => void;
    onOpenDetails: () => void;
    onDownload: (file: FileRecord) => Promise<void>;
    onSoftDelete: (file: FileRecord) => Promise<void>;
};

export function FileListView({
    files,
    selectedFileID,
    loading,
    onSelect,
    onOpenDetails,
    onDownload,
    onSoftDelete
}: FileListViewProps): JSX.Element {
    if (loading) {
        return (
            <section className="overflow-hidden rounded-[1.75rem] bg-white ring-1 ring-brand-line/70 shadow-soft">
                {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="border-b border-brand-steel/10 px-4 py-3 last:border-b-0">
                        <div className="h-11 animate-pulse rounded-2xl bg-gradient-to-r from-white via-brand-sky/70 to-white bg-[length:200%_100%]" />
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
        <section className="overflow-hidden rounded-3xl bg-white ring-1 ring-brand-line/70 shadow-soft">
            <div className="grid grid-cols-[minmax(0,1.6fr)_8rem_11rem_8rem] border-b border-brand-steel/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-brand-steel max-lg:hidden">
                <span>Nama</span>
                <span>Ukuran</span>
                <span>Tanggal</span>
                <span>Aksi</span>
            </div>

            <div className="divide-y divide-brand-steel/10">
                {files.map((file) => (
                    <article
                        key={file.id}
                        className={clsx(
                            "group grid cursor-pointer gap-3 px-4 py-3 transition duration-200 focus-within:bg-brand-sky/60 hover:bg-brand-sky/60 lg:grid-cols-[minmax(0,1.6fr)_8rem_11rem_8rem] lg:items-center",
                            selectedFileID === file.id ? "bg-brand-sky" : ""
                        )}
                        onClick={() => onSelect(file.id)}
                    >
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-mint/70 text-brand-logoBlue transition group-hover:bg-brand-mint">
                                <FileText className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-brand-logoBlue">{file.name}</p>
                                <p className="text-xs text-brand-steel lg:hidden">
                                    {formatBytes(file.size_bytes)} · {formatDate(file.created_at)}
                                </p>
                            </div>
                        </div>

                        <p className="hidden text-sm text-brand-steel lg:block">{formatBytes(file.size_bytes)}</p>
                        <p className="hidden text-sm text-brand-steel lg:block">{formatDate(file.created_at)}</p>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-brand-steel hover:bg-white hover:text-brand-logoBlue"
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
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-brand-steel hover:bg-white hover:text-brand-logoBlue"
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
            </div>
        </section>
    );
}
