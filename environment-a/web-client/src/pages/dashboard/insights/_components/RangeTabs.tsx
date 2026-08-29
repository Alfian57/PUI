import clsx from "clsx";
import type { InsightRange } from "@/pages/dashboard/insights/_api/insightApi";
import { RANGE_OPTIONS } from "@/pages/dashboard/insights/_lib/insightDisplay";

type RangeTabsProps = {
    range: InsightRange;
    onChange: (range: InsightRange) => void;
};

export function RangeTabs({ range, onChange }: RangeTabsProps): JSX.Element {
    return (
        <div className="flex rounded-2xl bg-white p-1 shadow-soft">
            {RANGE_OPTIONS.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    onClick={() => onChange(option.value)}
                    className={clsx(
                        "rounded-xl px-4 py-2 text-sm font-semibold transition",
                        range === option.value
                            ? "bg-brand-logoBlue text-white"
                            : "text-brand-steel hover:bg-brand-sky hover:text-brand-logoBlue"
                    )}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}
