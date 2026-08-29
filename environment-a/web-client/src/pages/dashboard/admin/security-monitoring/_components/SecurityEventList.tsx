import type { SecurityEvent } from "@/shared/types/security";
import { EmptyEvents } from "@/pages/dashboard/admin/security-monitoring/_components/EmptyEvents";
import { EventSkeleton } from "@/pages/dashboard/admin/security-monitoring/_components/EventSkeleton";
import { SecurityEventRow } from "@/pages/dashboard/admin/security-monitoring/_components/SecurityEventRow";

type SecurityEventListProps = {
    rows: SecurityEvent[];
    loading: boolean;
    page: number;
    hasMore: boolean;
    selectedEvent: SecurityEvent | null;
    onSelect: (event: SecurityEvent) => void;
    onPrevious: () => void;
    onNext: () => void;
};

export function SecurityEventList({ rows, loading, page, hasMore, selectedEvent, onSelect, onPrevious, onNext }: SecurityEventListProps): JSX.Element {
    return <div className="rounded-[1.75rem] bg-white p-5 shadow-soft ring-1 ring-brand-line/70">{loading ? <EventSkeleton /> : null}{!loading && rows.length === 0 ? <EmptyEvents /> : null}{rows.length > 0 ? <div className="space-y-3" data-testid="security-event-list">{rows.map((event) => <SecurityEventRow key={event.id} event={event} onSelect={onSelect} selected={selectedEvent?.id === event.id} />)}</div> : null}{(hasMore || page > 0) ? <div className="mt-5 flex justify-end gap-2"><button type="button" disabled={page === 0} onClick={onPrevious} className="rounded-2xl border border-brand-steel/20 px-4 py-2 text-sm font-semibold text-brand-steel disabled:opacity-40">Sebelumnya</button><button type="button" disabled={!hasMore} onClick={onNext} className="rounded-2xl border border-brand-steel/20 px-4 py-2 text-sm font-semibold text-brand-steel disabled:opacity-40">Selanjutnya</button></div> : null}</div>;
}
