import clsx from "clsx";
import { ChevronRight } from "lucide-react";
import { formatDate } from "@/shared/lib/format";
import type { SecurityEvent } from "@/shared/types/security";
import { eventMeta, outcomeLabel, outcomeTone } from "@/pages/dashboard/admin/_lib/securityMonitoring";

type SecurityEventRowProps = {
    event: SecurityEvent;
    onSelect: (event: SecurityEvent) => void;
    selected: boolean;
};

export function SecurityEventRow({ event, onSelect, selected }: SecurityEventRowProps): JSX.Element {
    const meta = eventMeta(event);
    const EventIcon = meta.icon;

    return (
        <button
            type="button"
            onClick={() => onSelect(event)}
            className={clsx(
                "w-full rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-soft",
                selected ? "border-brand-logoBlue bg-brand-sky/80" : "border-brand-line/70 bg-white hover:border-brand-logoYellow/60"
            )}
            data-testid="security-event-row"
            data-outcome={event.outcome}
        >
            <div className="flex items-start gap-3">
                <span className={clsx("mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl", meta.tone)}>
                    <EventIcon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                        <strong className="text-sm text-brand-ink">{event.title || meta.label}</strong>
                        <span className={clsx("rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide", outcomeTone(event.outcome))}>
                            {outcomeLabel(event.outcome)}
                        </span>
                    </span>
                    <span className="mt-1 block text-xs text-brand-steel">{meta.source} · {event.event_type}</span>
                    <span className="mt-2 block break-all font-mono text-xs text-brand-steel">
                        {event.method ? `${event.method} ${event.path}` : event.phase ? `${event.phase} / ${event.step}` : event.detail || "Event tercatat."}
                    </span>
                </span>
                <span className="flex shrink-0 items-center gap-1 text-xs text-brand-steel">
                    <time>{formatDate(event.occurred_at)}</time>
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </span>
            </div>
        </button>
    );
}
