import { useState, type ReactNode } from "react";
import { Info } from "lucide-react";

type SummaryItemProps = {
    label: string;
    value: string;
    icon: ReactNode;
};

export function SummaryItem({ label, value, icon }: SummaryItemProps): JSX.Element {
    const [infoOpen, setInfoOpen] = useState(false);
    const showEfficiencyInfo = label === "Efisiensi";

    return (
        <article className="relative rounded-3xl bg-white p-5 shadow-soft ring-1 ring-brand-line/70">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="text-sm text-brand-steel">{label}</p>
                        {showEfficiencyInfo ? (
                            <button
                                type="button"
                                onClick={() => setInfoOpen((current) => !current)}
                                className="inline-flex h-6 w-6 items-center justify-center rounded-full text-brand-steel transition hover:bg-brand-sky hover:text-brand-logoBlue focus:outline-none focus:ring-2 focus:ring-brand-logoYellow/40"
                                aria-label="Penjelasan efisiensi penyimpanan"
                                aria-expanded={infoOpen}
                            >
                                <Info className="h-4 w-4" aria-hidden="true" />
                            </button>
                        ) : null}
                    </div>
                    <p className="mt-1 truncate font-display text-2xl font-semibold text-brand-logoBlue">{value}</p>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-sky text-brand-steel">
                    {icon}
                </div>
            </div>
            {showEfficiencyInfo && infoOpen ? (
                <div className="absolute right-4 top-16 z-20 w-72 rounded-2xl bg-white p-4 text-sm leading-6 text-brand-steel shadow-deck ring-1 ring-brand-line/70">
                    Efisiensi menunjukkan seberapa banyak ruang penyimpanan yang berhasil dihemat saat HashBox menemukan bagian berkas yang sudah pernah tersimpan sebelumnya.
                </div>
            ) : null}
        </article>
    );
}
