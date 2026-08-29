type InsightMetricCardProps = {
    label: string;
    value: string;
    helper: string;
    icon: JSX.Element;
};

export function InsightMetricCard({ label, value, helper, icon }: InsightMetricCardProps): JSX.Element {
    return (
        <article className="rounded-[1.75rem] bg-white p-5 shadow-soft ring-1 ring-brand-line/70">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-sm text-brand-steel">{label}</p>
                    <p className="mt-2 truncate font-display text-3xl font-semibold text-brand-logoBlue">{value}</p>
                    <p className="mt-2 text-sm text-brand-steel">{helper}</p>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-sky text-brand-steel">
                    {icon}
                </div>
            </div>
        </article>
    );
}
