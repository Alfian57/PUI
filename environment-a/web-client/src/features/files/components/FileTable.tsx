import type { FileRecord } from "@/shared/types/domain";
import { formatBytes, formatDate } from "@/shared/lib/format";
import clsx from "clsx";

type FileTableProps = {
    files: FileRecord[];
    selectedFileID: string | null;
    loading: boolean;
    onSelect: (fileID: string) => void;
    onDownload: (file: FileRecord) => Promise<void>;
    onSoftDelete: (file: FileRecord) => Promise<void>;
};

export function FileTable({
    files,
    selectedFileID,
    loading,
    onSelect,
    onDownload,
    onSoftDelete
}: FileTableProps): JSX.Element {
    return (
        <section className="rounded-2xl border border-brand-steel/20 bg-white/85 p-5 shadow-soft backdrop-blur">
            <header className="mb-4 flex items-end justify-between">
                <div>
                    <p className="font-display text-[11px] uppercase tracking-[0.28em] text-brand-steel">Object Ledger</p>
                    <h3 className="font-display text-xl text-brand-ink">Daftar File</h3>
                </div>
            </header>

            {loading ? <p className="text-sm text-brand-steel/80">Memuat file...</p> : null}
            {!loading && files.length === 0 ? (
                <p className="text-sm text-brand-steel/80">Belum ada file pada direktori ini.</p>
            ) : null}

            <div className="overflow-auto">
                <table className="min-w-full border-separate border-spacing-y-2 text-sm">
                    <thead>
                        <tr className="text-left text-brand-steel">
                            <th className="px-3 py-2 font-medium">Nama</th>
                            <th className="px-3 py-2 font-medium">Ukuran</th>
                            <th className="px-3 py-2 font-medium">Terbuat</th>
                            <th className="px-3 py-2 font-medium">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {files.map((file) => (
                            <tr
                                key={file.id}
                                className={clsx(
                                    "cursor-pointer rounded-xl transition",
                                    selectedFileID === file.id ? "bg-brand-mint/70" : "bg-brand-sky/45 hover:bg-brand-sky"
                                )}
                                onClick={() => onSelect(file.id)}
                            >
                                <td className="rounded-l-xl px-3 py-2 font-medium text-brand-ink">{file.name}</td>
                                <td className="px-3 py-2 text-brand-steel">{formatBytes(file.size_bytes)}</td>
                                <td className="px-3 py-2 text-brand-steel">{formatDate(file.created_at)}</td>
                                <td className="rounded-r-xl px-3 py-2">
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            className="rounded-md border border-brand-steel/30 px-2 py-1 text-xs text-brand-steel hover:bg-white"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                void onDownload(file);
                                            }}
                                        >
                                            Unduh
                                        </button>
                                        <button
                                            type="button"
                                            className="rounded-md border border-brand-coral/40 px-2 py-1 text-xs text-brand-coral hover:bg-brand-coral/10"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                void onSoftDelete(file);
                                            }}
                                        >
                                            Soft Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
