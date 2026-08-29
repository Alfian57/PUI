import { formatDate } from "@/shared/lib/format";
import type { SecurityEvent } from "@/shared/types/security";
import { EvidenceField } from "@/pages/dashboard/admin/security-monitoring/_components/EvidenceField";

type EvidenceItemProps = {
    event: SecurityEvent;
};

export function EvidenceItem({ event }: EvidenceItemProps): JSX.Element {
    return (
        <article className="rounded-2xl border border-brand-line/70 bg-brand-sky/45 p-4">
            <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-brand-steel">{event.source} · {event.event_type}</p>
                <time className="text-[11px] text-brand-steel">{formatDate(event.occurred_at)}</time>
            </div>
            {event.detail ? <p className="mt-2 text-sm leading-6 text-brand-ink">{event.detail}</p> : null}
            <dl className="mt-3 space-y-1 text-xs">
                {event.method ? <EvidenceField label="Request" value={`${event.method} ${event.path ?? ""}`} /> : null}
                {event.status_code ? <EvidenceField label="HTTP status" value={String(event.status_code)} /> : null}
                {event.error_code ? <EvidenceField label="Error code" value={event.error_code} /> : null}
                {event.client_ip ? <EvidenceField label="Client IP" value={event.client_ip} /> : null}
                {event.phase ? <EvidenceField label="Phase" value={`${event.phase} / ${event.step ?? ""}`} /> : null}
            </dl>
            {event.details && Object.keys(event.details).length > 0 ? (
                <pre className="mt-3 max-h-52 overflow-auto rounded-xl bg-brand-ink p-3 text-[11px] leading-5 text-white">
                    {JSON.stringify(event.details, null, 2)}
                </pre>
            ) : null}
        </article>
    );
}
