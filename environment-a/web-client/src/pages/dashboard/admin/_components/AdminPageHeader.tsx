import clsx from "clsx";
import type { AdminAnalyticsRange } from "@/pages/dashboard/admin/_api/adminApi";
import { RANGE_OPTIONS } from "@/pages/dashboard/admin/_lib/analytics";

type AdminPageHeaderProps = {
    title: string;
    description: string;
    range?: AdminAnalyticsRange;
    onRangeChange?: (range: AdminAnalyticsRange) => void;
    dataTour?: string;
};

export function AdminPageHeader({ title, description, range, onRangeChange, dataTour }: AdminPageHeaderProps): JSX.Element {
    const hasRangeSelector = Boolean(range && onRangeChange);

    return (
        <section className={hasRangeSelector ? "flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between" : undefined} data-tour={dataTour}>
            <div>
                <h1 className="font-display text-3xl font-semibold text-brand-logoBlue">{title}</h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-brand-steel">{description}</p>
            </div>
            {range && onRangeChange ? (
                <div className="flex rounded-2xl bg-white p-1 shadow-soft">
                    {RANGE_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => onRangeChange(option.value)}
                            className={clsx(
                                "rounded-xl px-4 py-2 text-sm font-semibold transition",
                                range === option.value ? "bg-brand-logoBlue text-white" : "text-brand-steel hover:bg-brand-sky hover:text-brand-logoBlue"
                            )}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            ) : null}
        </section>
    );
}
