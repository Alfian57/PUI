import clsx from "clsx";
import { Server } from "lucide-react";
import type { SecurityEvent } from "@/shared/types/security";
import { eventMeta, outcomeLabel, outcomeTone } from "@/pages/dashboard/admin/_lib/securityMonitoring";
import { EvidenceItem } from "@/pages/dashboard/admin/security-monitoring/_components/EvidenceItem";

type EventEvidenceProps = {
    event: SecurityEvent | null;
    runEvents: SecurityEvent[];
    loading: boolean;
};

export function EventEvidence({ event, runEvents, loading }: EventEvidenceProps): JSX.Element {
    if (!event) {
        return (
            <aside className="flex flex-col rounded-[1.75rem] bg-white p-5 shadow-soft ring-1 ring-brand-line/70" data-testid="security-event-evidence">
                <div className="flex min-h-[320px] flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-brand-steel/20 bg-brand-sky/40 p-6 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-sky text-brand-steel">
                        <Server className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <h2 className="mt-4 font-display text-lg font-semibold text-brand-logoBlue">Pilih event untuk melihat bukti</h2>
                    <p className="mt-1.5 max-w-sm text-sm leading-6 text-brand-steel">Detail respons, sumber, dan timeline Security Lab akan tampil di panel ini.</p>
                </div>
            </aside>
        );
    }

    const timeline = event.run_id ? runEvents : [event];

    return (
        <aside className="rounded-[1.75rem] bg-white p-5 shadow-soft ring-1 ring-brand-line/70" data-testid="security-event-evidence">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="font-display text-[11px] uppercase tracking-[0.2em] text-brand-steel">Bukti event</p>
                    <h2 className="mt-1 font-display text-xl font-semibold text-brand-logoBlue">{event.title || eventMeta(event).label}</h2>
                </div>
                <span className={clsx("rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide", outcomeTone(event.outcome))}>
                    {outcomeLabel(event.outcome)}
                </span>
            </div>
            {event.run_id ? <p className="mt-2 break-all font-mono text-xs text-brand-steel">run_id: {event.run_id}</p> : null}
            {loading ? (
                <div className="mt-5 h-24 animate-pulse rounded-2xl bg-brand-sky" />
            ) : (
                <div className="mt-5 space-y-3">
                    {timeline.map((item) => <EvidenceItem key={item.id} event={item} />)}
                </div>
            )}
        </aside>
    );
}
