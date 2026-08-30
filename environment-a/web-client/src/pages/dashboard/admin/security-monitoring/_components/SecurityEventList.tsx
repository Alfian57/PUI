import type { SecurityEvent } from "@/shared/types/security";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EmptyEvents } from "@/pages/dashboard/admin/security-monitoring/_components/EmptyEvents";
import { EventSkeleton } from "@/pages/dashboard/admin/security-monitoring/_components/EventSkeleton";
import { SecurityEventRow } from "@/pages/dashboard/admin/security-monitoring/_components/SecurityEventRow";

type PaginationItem = number | "ellipsis-start" | "ellipsis-end";

type SecurityEventListProps = {
    rows: SecurityEvent[];
    loading: boolean;
    page: number;
    totalPages: number;
    hasMore: boolean;
    selectedEvent: SecurityEvent | null;
    onSelect: (event: SecurityEvent) => void;
    onPrevious: () => void;
    onNext: () => void;
    onPageChange: (page: number) => void;
};

function paginationItems(page: number, totalPages: number): PaginationItem[] {
    if (totalPages <= 5) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const currentPage = page + 1;
    if (currentPage <= 3) {
        return [1, 2, 3, 4, "ellipsis-end", totalPages];
    }
    if (currentPage >= totalPages - 2) {
        return [1, "ellipsis-start", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "ellipsis-start", currentPage - 1, currentPage, currentPage + 1, "ellipsis-end", totalPages];
}

export function SecurityEventList({ rows, loading, page, totalPages, hasMore, selectedEvent, onSelect, onPrevious, onNext, onPageChange }: SecurityEventListProps): JSX.Element {
    const showPagination = totalPages > 1 || page > 0;

    return <div className="rounded-[1.75rem] bg-white p-5 shadow-soft ring-1 ring-brand-line/70">{loading ? <EventSkeleton /> : null}{!loading && rows.length === 0 ? <EmptyEvents /> : null}{rows.length > 0 ? <div className="space-y-3" data-testid="security-event-list">{rows.map((event) => <SecurityEventRow key={event.id} event={event} onSelect={onSelect} selected={selectedEvent?.id === event.id} />)}</div> : null}{showPagination ? <nav className="mt-5 flex flex-wrap items-center justify-end gap-1.5" aria-label="Pagination log keamanan"><button type="button" disabled={page === 0} onClick={onPrevious} aria-label="Halaman sebelumnya" title="Halaman sebelumnya" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-brand-steel/20 text-brand-steel transition hover:border-brand-logoBlue/40 hover:bg-brand-sky disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="h-4 w-4" aria-hidden="true" /></button>{paginationItems(page, totalPages).map((item) => typeof item === "number" ? <button key={item} type="button" onClick={() => onPageChange(item - 1)} aria-label={`Ke halaman ${item}`} aria-current={page === item - 1 ? "page" : undefined} className={page === item - 1 ? "inline-flex h-10 min-w-10 items-center justify-center rounded-xl bg-brand-logoBlue px-3 text-sm font-semibold text-white" : "inline-flex h-10 min-w-10 items-center justify-center rounded-xl border border-brand-steel/20 px-3 text-sm font-semibold text-brand-logoBlue transition hover:border-brand-logoBlue/40 hover:bg-brand-sky"}>{item}</button> : <span key={item} className="inline-flex h-10 w-5 items-center justify-center text-sm text-brand-steel/70" aria-hidden="true">…</span>)}<button type="button" disabled={!hasMore} onClick={onNext} aria-label="Halaman berikutnya" title="Halaman berikutnya" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-brand-steel/20 text-brand-steel transition hover:border-brand-logoBlue/40 hover:bg-brand-sky disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight className="h-4 w-4" aria-hidden="true" /></button></nav> : null}</div>;
}
