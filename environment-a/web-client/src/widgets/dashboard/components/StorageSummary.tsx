import { useState } from "react";
import { Database, FileArchive, FolderOpen, Info, TrendingUp } from "lucide-react";
import { formatBytes } from "@/shared/lib/format";

type StorageSummaryProps = {
    totalFiles: number;
    totalBytes: number;
    dedup: string;
    folderCount: number;
};

export function StorageSummary({ totalFiles, totalBytes, dedup, folderCount }: StorageSummaryProps): JSX.Element {
    return (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryItem
                label="Berkas"
                value={String(totalFiles)}
                icon={<FileArchive className="h-5 w-5" aria-hidden="true" />}
            />
            <SummaryItem
                label="Direktori"
                value={String(folderCount)}
                icon={<FolderOpen className="h-5 w-5" aria-hidden="true" />}
            />
            <SummaryItem
                label="Ukuran"
                value={formatBytes(totalBytes)}
                icon={<Database className="h-5 w-5" aria-hidden="true" />}
            />
            <SummaryItem
                label="Efisiensi"
                value={dedup}
                icon={<TrendingUp className="h-5 w-5" aria-hidden="true" />}
            />
        </section>
    );
}

type SummaryItemProps = {
    label: string;
    value: string;
    icon: JSX.Element;
};

function SummaryItem({ label, value, icon }: SummaryItemProps): JSX.Element {
    const [infoOpen, setInfoOpen] = useState(false);
    const showEfficiencyInfo = label === "Efisiensi";

    return (
        <article className="relative rounded-3xl border border-brand-steel/10 bg-white p-4 shadow-soft">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="text-sm text-brand-steel">{label}</p>
                        {showEfficiencyInfo ? (
                            <button
                                type="button"
                                onClick={() => setInfoOpen((current) => !current)}
                                className="inline-flex h-6 w-6 items-center justify-center rounded-full text-brand-steel transition hover:bg-brand-sky hover:text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-amber/40"
                                aria-label="Penjelasan efisiensi penyimpanan"
                                aria-expanded={infoOpen}
                            >
                                <Info className="h-4 w-4" aria-hidden="true" />
                            </button>
                        ) : null}
                    </div>
                    <p className="mt-1 truncate font-display text-2xl font-semibold text-brand-ink">{value}</p>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-sky text-brand-steel">
                    {icon}
                </div>
            </div>
            {showEfficiencyInfo && infoOpen ? (
                <div className="absolute right-4 top-16 z-20 w-72 rounded-2xl border border-brand-steel/10 bg-white p-4 text-sm leading-6 text-brand-steel shadow-deck">
                    Efisiensi menunjukkan seberapa banyak ruang penyimpanan yang berhasil dihemat saat HashBox menemukan bagian berkas yang sudah pernah tersimpan sebelumnya.
                </div>
            ) : null}
        </article>
    );
}
