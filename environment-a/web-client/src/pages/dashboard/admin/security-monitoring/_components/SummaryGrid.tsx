import clsx from "clsx";
import { Activity, Eye, ShieldAlert, ShieldCheck } from "lucide-react";
import type { SecurityEventSummary } from "@/shared/types/security";
import { formatCount } from "@/shared/lib/format";

type SummaryGridProps = {
    summary: SecurityEventSummary | undefined;
    loading: boolean;
};

export function SummaryGrid({ summary, loading }: SummaryGridProps): JSX.Element {
    const items = [
        { label: "Total event", value: summary?.total_events ?? 0, icon: Activity, tone: "text-brand-logoBlue" },
        { label: "Terdeteksi", value: summary?.detected ?? 0, icon: Eye, tone: "text-amber-700" },
        { label: "Diblokir", value: summary?.blocked ?? 0, icon: ShieldCheck, tone: "text-emerald-700" },
        { label: "Breach", value: summary?.breaches ?? 0, icon: ShieldAlert, tone: "text-red-700" }
    ];

    return (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {items.map((item) => {
                const ItemIcon = item.icon;

                return (
                    <article key={item.label} className="rounded-[1.5rem] bg-white p-5 shadow-soft ring-1 ring-brand-line/70">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-brand-steel">{item.label}</p>
                            <span className={item.tone}><ItemIcon className="h-5 w-5" aria-hidden="true" /></span>
                        </div>
                        {loading ? (
                            <div className="mt-3 h-9 w-20 animate-pulse rounded-lg bg-brand-sky" />
                        ) : (
                            <p className={clsx("mt-2 font-display text-3xl font-semibold", item.tone)}>{formatCount(item.value, "event")}</p>
                        )}
                    </article>
                );
            })}
        </section>
    );
}
