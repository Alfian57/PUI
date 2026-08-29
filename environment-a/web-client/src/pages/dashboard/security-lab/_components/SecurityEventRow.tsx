import clsx from "clsx";
import type { SecurityLabEvent } from "@/pages/dashboard/security-lab/_types/securityLab";
import { STATUS_META, formatSecurityValue } from "@/pages/dashboard/security-lab/_lib/securityDisplay";

type SecurityEventRowProps = {
    event: SecurityLabEvent;
};

export function SecurityEventRow({ event }: SecurityEventRowProps): JSX.Element {
    const meta = STATUS_META[event.status];
    const StatusIcon = meta.icon;
    const dataEntries = event.data ? Object.entries(event.data) : [];

    return (
        <div
            className="rounded-2xl border border-brand-line/70 bg-white p-4 shadow-soft"
            data-testid="security-event"
            data-status={event.status}
        >
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-display text-sm font-semibold text-brand-ink">{event.title}</p>
                <span
                    className={clsx(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-wide",
                        meta.badge
                    )}
                >
                    <StatusIcon className="h-4 w-4" aria-hidden="true" />
                    {meta.label}
                </span>
            </div>
            {event.detail ? <p className="mt-1 text-sm text-brand-steel">{event.detail}</p> : null}
            {dataEntries.length > 0 ? (
                <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
                    {dataEntries.map(([key, value]) => (
                        <div key={key} className="flex flex-col border-t border-brand-line/50 py-1 sm:flex-row sm:items-baseline sm:gap-2">
                            <dt className="text-xs font-semibold uppercase tracking-wide text-brand-steel/70">{key}</dt>
                            <dd className="break-all font-mono text-xs text-brand-ink">{formatSecurityValue(value)}</dd>
                        </div>
                    ))}
                </dl>
            ) : null}
        </div>
    );
}
