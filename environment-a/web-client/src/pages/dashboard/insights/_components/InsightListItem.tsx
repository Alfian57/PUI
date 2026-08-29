type InsightListItemProps = {
    icon: JSX.Element;
    title: string;
    meta: string;
};

export function InsightListItem({ icon, title, meta }: InsightListItemProps): JSX.Element {
    return (
        <div className="flex items-center gap-3 rounded-2xl border border-brand-steel/10 px-3 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-sky text-brand-steel">
                {icon}
            </div>
            <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-brand-logoBlue">{title}</p>
                <p className="truncate text-xs text-brand-steel">{meta}</p>
            </div>
        </div>
    );
}
