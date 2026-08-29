import clsx from "clsx";
import { Filter, RefreshCw } from "lucide-react";
import type { SecurityMonitorRange } from "@/pages/dashboard/admin/security-monitoring/_api/securityMonitorApi";
import { Button } from "@/components/ui/Button";
import { SelectFilter } from "@/pages/dashboard/admin/security-monitoring/_components/SelectFilter";
import { EVENT_TYPE_OPTIONS, OUTCOME_OPTIONS, RANGE_OPTIONS, SOURCE_OPTIONS } from "@/pages/dashboard/admin/_lib/securityMonitoring";

type SecurityMonitorFiltersProps = {
    range: SecurityMonitorRange;
    eventType: string;
    source: string;
    outcome: string;
    total: number;
    onRangeChange: (range: SecurityMonitorRange) => void;
    onEventTypeChange: (value: string) => void;
    onSourceChange: (value: string) => void;
    onOutcomeChange: (value: string) => void;
    onReset: () => void;
};

export function SecurityMonitorFilters({
    range,
    eventType,
    source,
    outcome,
    total,
    onRangeChange,
    onEventTypeChange,
    onSourceChange,
    onOutcomeChange,
    onReset
}: SecurityMonitorFiltersProps): JSX.Element {
    return (
        <section className="rounded-[1.75rem] bg-white p-5 shadow-soft ring-1 ring-brand-line/70">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-brand-steel" aria-hidden="true" />
                    <div>
                        <h2 className="font-display text-xl font-semibold text-brand-logoBlue">Event keamanan</h2>
                        <p className="text-sm text-brand-steel">{total} event pada rentang aktif.</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {RANGE_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => onRangeChange(option.value)}
                            className={clsx(
                                "rounded-xl px-3 py-2 text-sm font-semibold transition",
                                range === option.value
                                    ? "bg-brand-logoBlue text-white"
                                    : "bg-brand-sky text-brand-steel hover:text-brand-logoBlue"
                            )}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-5 grid items-end gap-3 md:grid-cols-2 xl:grid-cols-4">
                <SelectFilter label="Tipe event" value={eventType} options={EVENT_TYPE_OPTIONS} onChange={onEventTypeChange} />
                <SelectFilter label="Sumber" value={source} options={SOURCE_OPTIONS} onChange={onSourceChange} />
                <SelectFilter label="Outcome" value={outcome} options={OUTCOME_OPTIONS} onChange={onOutcomeChange} />
                <Button
                    variant="secondary"
                    className="h-[42px] w-full"
                    onClick={onReset}
                    icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
                >
                    Reset filter
                </Button>
            </div>
        </section>
    );
}
