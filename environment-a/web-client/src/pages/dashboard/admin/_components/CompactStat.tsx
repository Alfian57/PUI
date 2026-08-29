type CompactStatProps = {
    label: string;
    value: string;
    icon: JSX.Element;
};

export function CompactStat({ label, value, icon }: CompactStatProps): JSX.Element {
    return (
        <article className="flex items-center gap-3 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-brand-line/70">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-sky text-brand-steel">
                {icon}
            </div>
            <div>
                <p className="text-sm text-brand-steel">{label}</p>
                <p className="font-display text-xl font-semibold text-brand-logoBlue">{value}</p>
            </div>
        </article>
    );
}
