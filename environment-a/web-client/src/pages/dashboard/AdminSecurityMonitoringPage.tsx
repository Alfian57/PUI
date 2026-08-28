import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    ChevronRight,
    CircleAlert,
    Clock3,
    Eye,
    Filter,
    Radio,
    RefreshCw,
    Server,
    ShieldAlert,
    ShieldCheck,
    XCircle
} from "lucide-react";
import { getSecurityEvents, getSecurityEventSummary, type SecurityEventFilters, type SecurityMonitorRange } from "@/features/security-monitor/api/securityMonitorApi";
import { useSecurityMonitorStream } from "@/features/security-monitor/hooks/useSecurityMonitorStream";
import { queryKeys } from "@/shared/lib/queryKeys";
import { formatDate } from "@/shared/lib/format";
import type { SecurityEvent, SecurityEventSummary } from "@/shared/types/domain";
import { Button } from "@/shared/ui/Button";

const RANGE_OPTIONS: Array<{ value: SecurityMonitorRange; label: string }> = [
    { value: "24h", label: "24 jam" },
    { value: "7d", label: "7 hari" },
    { value: "30d", label: "30 hari" }
];

const EVENT_TYPE_OPTIONS = [
    ["", "Semua tipe"],
    ["FAILED_LOGIN", "Login gagal"],
    ["UNAUTHORIZED_REQUEST", "Unauthorized"],
    ["FORBIDDEN_REQUEST", "Forbidden"],
    ["RATE_LIMIT_BLOCKED", "Rate limit"],
    ["VAULT_OPERATION_BLOCKED", "Vault diblokir"],
    ["SECURITY_LAB_EVENT", "Security Lab event"],
    ["SECURITY_LAB_SUMMARY", "Security Lab summary"]
] as const;

const OUTCOME_OPTIONS = [
    ["", "Semua status"],
    ["detected", "Terdeteksi"],
    ["blocked", "Diblokir"],
    ["breach", "Breach"],
    ["ok", "OK"],
    ["info", "Info"]
] as const;

const SOURCE_OPTIONS = [
    ["", "Semua sumber"],
    ["api", "API Service"],
    ["vault_core", "Vault Core"],
    ["security_lab", "Security Lab"]
] as const;

export function AdminSecurityMonitoringPage(): JSX.Element {
    const [range, setRange] = useState<SecurityMonitorRange>("24h");
    const [eventType, setEventType] = useState("");
    const [source, setSource] = useState("");
    const [outcome, setOutcome] = useState("");
    const [page, setPage] = useState(0);
    const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
    const [selectedRunID, setSelectedRunID] = useState<string | null>(null);
    const { events: liveEvents, connection, error: streamError } = useSecurityMonitorStream(true);

    const filters = useMemo<SecurityEventFilters>(() => ({
        range,
        eventType,
        source,
        outcome,
        limit: 25,
        offset: page * 25
    }), [eventType, outcome, page, range, source]);
    const filterKey = useMemo(() => JSON.stringify(filters), [filters]);
    const eventsQuery = useQuery({
        queryKey: queryKeys.admin.securityEvents(filterKey),
        queryFn: () => getSecurityEvents(filters)
    });
    const summaryQuery = useQuery({
        queryKey: queryKeys.admin.securitySummary(range),
        queryFn: () => getSecurityEventSummary(range)
    });
    const runQuery = useQuery({
        queryKey: queryKeys.admin.securityEvents(`run:${selectedRunID ?? "none"}`),
        queryFn: () => getSecurityEvents({ range: "30d", runID: selectedRunID ?? undefined, limit: 100 }),
        enabled: Boolean(selectedRunID)
    });

    const historyEvents = eventsQuery.data?.security_events ?? [];
    const historyIDs = useMemo(() => new Set(historyEvents.map((event) => event.id)), [historyEvents]);
    const liveRows = useMemo(() => liveEvents.filter((event) => {
        const isInRange = new Date(event.occurred_at).getTime() >= rangeStart(range);
        const matchesType = !eventType || event.event_type === eventType;
        const matchesSource = !source || event.source === source;
        const matchesOutcome = !outcome || event.outcome === outcome;
        return isInRange && matchesType && matchesSource && matchesOutcome && !historyIDs.has(event.id);
    }), [eventType, historyIDs, liveEvents, outcome, range, source]);
    const rows = useMemo(() => [...liveRows, ...historyEvents].sort(sortNewest).slice(0, 25), [historyEvents, liveRows]);
    const summary = useLiveSummary(summaryQuery.data, liveRows);
    const selectedRunEvents = useMemo(() => (runQuery.data?.security_events ?? []).sort(sortOldest), [runQuery.data]);
    const hasMore = (page + 1) * 25 < (eventsQuery.data?.total ?? 0);

    function resetFilters(): void {
        setEventType("");
        setSource("");
        setOutcome("");
        setPage(0);
    }

    function selectEvent(event: SecurityEvent): void {
        setSelectedEvent(event);
        setSelectedRunID(event.run_id ?? null);
    }

    return (
        <div className="space-y-6" data-testid="security-monitor-page">
            <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="font-display text-[11px] uppercase tracking-[0.24em] text-brand-steel">Operasional</p>
                    <h1 className="mt-1 font-display text-3xl font-semibold text-brand-logoBlue">Monitoring Keamanan</h1>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-brand-steel">
                        Bukti event keamanan API, Vault Core, dan Security Lab. Histori disimpan selama 30 hari dan diperbarui saat serangan berlangsung.
                    </p>
                </div>
                <div className={clsx("inline-flex items-center gap-2 self-start rounded-full px-3 py-2 text-xs font-semibold lg:self-auto", connectionTone(connection))} data-testid="security-monitor-connection">
                    <Radio className={clsx("h-4 w-4", connection === "live" && "animate-pulse")} aria-hidden="true" />
                    {connectionLabel(connection)}
                </div>
            </header>

            {streamError ? <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">{streamError} Histori tetap dapat dimuat.</p> : null}

            <SummaryGrid summary={summary} loading={summaryQuery.isLoading} />

            <section className="rounded-[1.75rem] bg-white p-5 shadow-soft ring-1 ring-brand-line/70">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div className="flex items-center gap-2">
                        <Filter className="h-5 w-5 text-brand-steel" aria-hidden="true" />
                        <div>
                            <h2 className="font-display text-xl font-semibold text-brand-logoBlue">Event keamanan</h2>
                            <p className="text-sm text-brand-steel">{eventsQuery.data?.total ?? 0} event pada rentang aktif.</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {RANGE_OPTIONS.map((option) => (
                            <button key={option.value} type="button" onClick={() => { setRange(option.value); setPage(0); }} className={clsx("rounded-xl px-3 py-2 text-sm font-semibold transition", range === option.value ? "bg-brand-logoBlue text-white" : "bg-brand-sky text-brand-steel hover:text-brand-logoBlue")}>
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <SelectFilter label="Tipe event" value={eventType} options={EVENT_TYPE_OPTIONS} onChange={(value) => { setEventType(value); setPage(0); }} />
                    <SelectFilter label="Sumber" value={source} options={SOURCE_OPTIONS} onChange={(value) => { setSource(value); setPage(0); }} />
                    <SelectFilter label="Outcome" value={outcome} options={OUTCOME_OPTIONS} onChange={(value) => { setOutcome(value); setPage(0); }} />
                    <Button variant="secondary" className="h-[42px]" onClick={resetFilters} icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}>Reset filter</Button>
                </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
                <div className="rounded-[1.75rem] bg-white p-5 shadow-soft ring-1 ring-brand-line/70">
                    {eventsQuery.isLoading ? <EventSkeleton /> : null}
                    {!eventsQuery.isLoading && rows.length === 0 ? <EmptyEvents /> : null}
                    {rows.length > 0 ? (
                        <div className="space-y-3" data-testid="security-event-list">
                            {rows.map((event) => <SecurityEventRow key={event.id} event={event} onSelect={selectEvent} selected={selectedEvent?.id === event.id} />)}
                        </div>
                    ) : null}
                    {(hasMore || page > 0) ? (
                        <div className="mt-5 flex justify-end gap-2">
                            <button type="button" disabled={page === 0} onClick={() => setPage((value) => value - 1)} className="rounded-2xl border border-brand-steel/20 px-4 py-2 text-sm font-semibold text-brand-steel disabled:opacity-40">Sebelumnya</button>
                            <button type="button" disabled={!hasMore} onClick={() => setPage((value) => value + 1)} className="rounded-2xl border border-brand-steel/20 px-4 py-2 text-sm font-semibold text-brand-steel disabled:opacity-40">Selanjutnya</button>
                        </div>
                    ) : null}
                </div>
                <EventEvidence event={selectedEvent} runEvents={selectedRunEvents} loading={runQuery.isLoading} />
            </section>
        </div>
    );
}

function SummaryGrid({ summary, loading }: { summary: SecurityEventSummary | undefined; loading: boolean }): JSX.Element {
    const items = [
        { label: "Total event", value: summary?.total_events ?? 0, icon: <Activity className="h-5 w-5" />, tone: "text-brand-logoBlue" },
        { label: "Terdeteksi", value: summary?.detected ?? 0, icon: <Eye className="h-5 w-5" />, tone: "text-amber-700" },
        { label: "Diblokir", value: summary?.blocked ?? 0, icon: <ShieldCheck className="h-5 w-5" />, tone: "text-emerald-700" },
        { label: "Breach", value: summary?.breaches ?? 0, icon: <ShieldAlert className="h-5 w-5" />, tone: "text-red-700" }
    ];
    return <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{items.map((item) => <article key={item.label} className="rounded-[1.5rem] bg-white p-5 shadow-soft ring-1 ring-brand-line/70"><div className="flex items-center justify-between"><p className="text-sm text-brand-steel">{item.label}</p><span className={item.tone}>{item.icon}</span></div>{loading ? <div className="mt-3 h-9 w-20 animate-pulse rounded-lg bg-brand-sky" /> : <p className={clsx("mt-2 font-display text-3xl font-semibold", item.tone)}>{item.value}</p>}</article>)}</section>;
}

function useLiveSummary(summary: SecurityEventSummary | undefined, liveEvents: SecurityEvent[]): SecurityEventSummary | undefined {
    return useMemo(() => {
        if (!summary || liveEvents.length === 0) return summary;
        return {
            ...summary,
            total_events: summary.total_events + liveEvents.length,
            detected: summary.detected + liveEvents.filter((event) => event.outcome === "detected").length,
            blocked: summary.blocked + liveEvents.filter((event) => event.outcome === "blocked").length,
            breaches: summary.breaches + liveEvents.filter((event) => event.outcome === "breach").length,
            security_lab_runs: summary.security_lab_runs + liveEvents.filter((event) => event.event_type === "SECURITY_LAB_SUMMARY").length,
            last_event_at: liveEvents[0]?.occurred_at ?? summary.last_event_at
        };
    }, [liveEvents, summary]);
}

function SelectFilter({ label, value, options, onChange }: { label: string; value: string; options: readonly (readonly [string, string])[]; onChange: (value: string) => void }): JSX.Element {
    return <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-steel">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-[42px] w-full rounded-2xl border border-brand-line bg-white px-3 text-sm font-medium text-brand-ink outline-none focus:border-brand-logoYellow focus:ring-2 focus:ring-brand-logoYellow/30">{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>;
}

function SecurityEventRow({ event, onSelect, selected }: { event: SecurityEvent; onSelect: (event: SecurityEvent) => void; selected: boolean }): JSX.Element {
    const meta = eventMeta(event);
    return <button type="button" onClick={() => onSelect(event)} className={clsx("w-full rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-soft", selected ? "border-brand-logoBlue bg-brand-sky/80" : "border-brand-line/70 bg-white hover:border-brand-logoYellow/60")} data-testid="security-event-row" data-outcome={event.outcome}>
        <div className="flex items-start gap-3"><span className={clsx("mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl", meta.tone)}>{meta.icon}</span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><strong className="text-sm text-brand-ink">{event.title || meta.label}</strong><span className={clsx("rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide", outcomeTone(event.outcome))}>{outcomeLabel(event.outcome)}</span></span><span className="mt-1 block text-xs text-brand-steel">{meta.source} · {event.event_type}</span><span className="mt-2 block break-all font-mono text-xs text-brand-steel">{event.method ? `${event.method} ${event.path}` : event.phase ? `${event.phase} / ${event.step}` : event.detail || "Event tercatat."}</span></span><span className="flex shrink-0 items-center gap-1 text-xs text-brand-steel"><time>{formatDate(event.occurred_at)}</time><ChevronRight className="h-4 w-4" aria-hidden="true" /></span></div>
    </button>;
}

function EventEvidence({ event, runEvents, loading }: { event: SecurityEvent | null; runEvents: SecurityEvent[]; loading: boolean }): JSX.Element {
    if (!event) return <aside className="rounded-[1.75rem] bg-brand-sky/60 p-6 ring-1 ring-brand-line/70"><div className="flex h-full min-h-64 flex-col items-center justify-center text-center"><Server className="h-8 w-8 text-brand-steel" aria-hidden="true" /><h2 className="mt-3 font-display text-xl font-semibold text-brand-logoBlue">Pilih event untuk melihat bukti</h2><p className="mt-1 max-w-sm text-sm leading-6 text-brand-steel">Detail respons, sumber, dan timeline Security Lab akan tampil di panel ini.</p></div></aside>;
    const timeline = event.run_id ? runEvents : [event];
    return <aside className="rounded-[1.75rem] bg-white p-5 shadow-soft ring-1 ring-brand-line/70" data-testid="security-event-evidence"><div className="flex items-start justify-between gap-3"><div><p className="font-display text-[11px] uppercase tracking-[0.2em] text-brand-steel">Bukti event</p><h2 className="mt-1 font-display text-xl font-semibold text-brand-logoBlue">{event.title || eventMeta(event).label}</h2></div><span className={clsx("rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide", outcomeTone(event.outcome))}>{outcomeLabel(event.outcome)}</span></div>{event.run_id ? <p className="mt-2 break-all font-mono text-xs text-brand-steel">run_id: {event.run_id}</p> : null}{loading ? <div className="mt-5 h-24 animate-pulse rounded-2xl bg-brand-sky" /> : <div className="mt-5 space-y-3">{timeline.map((item) => <EvidenceItem key={item.id} event={item} />)}</div>}</aside>;
}

function EvidenceItem({ event }: { event: SecurityEvent }): JSX.Element {
    return <article className="rounded-2xl border border-brand-line/70 bg-brand-sky/45 p-4"><div className="flex items-center justify-between gap-2"><p className="text-xs font-bold uppercase tracking-wide text-brand-steel">{event.source} · {event.event_type}</p><time className="text-[11px] text-brand-steel">{formatDate(event.occurred_at)}</time></div>{event.detail ? <p className="mt-2 text-sm leading-6 text-brand-ink">{event.detail}</p> : null}<dl className="mt-3 space-y-1 text-xs">{event.method ? <EvidenceField label="Request" value={`${event.method} ${event.path ?? ""}`} /> : null}{event.status_code ? <EvidenceField label="HTTP status" value={String(event.status_code)} /> : null}{event.error_code ? <EvidenceField label="Error code" value={event.error_code} /> : null}{event.client_ip ? <EvidenceField label="Client IP" value={event.client_ip} /> : null}{event.phase ? <EvidenceField label="Phase" value={`${event.phase} / ${event.step ?? ""}`} /> : null}</dl>{event.details && Object.keys(event.details).length > 0 ? <pre className="mt-3 max-h-52 overflow-auto rounded-xl bg-brand-ink p-3 text-[11px] leading-5 text-white">{JSON.stringify(event.details, null, 2)}</pre> : null}</article>;
}

function EvidenceField({ label, value }: { label: string; value: string }): JSX.Element { return <div className="flex gap-2"><dt className="font-semibold text-brand-steel">{label}</dt><dd className="break-all font-mono text-brand-ink">{value}</dd></div>; }

function EmptyEvents(): JSX.Element { return <div className="rounded-2xl border border-dashed border-brand-line px-5 py-12 text-center"><CircleAlert className="mx-auto h-8 w-8 text-brand-steel" aria-hidden="true" /><p className="mt-3 font-display text-lg font-semibold text-brand-logoBlue">Belum ada event keamanan</p><p className="mt-1 text-sm text-brand-steel">Event yang memenuhi filter akan muncul di sini.</p></div>; }
function EventSkeleton(): JSX.Element { return <div className="space-y-3">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-2xl bg-gradient-to-r from-white via-brand-sky to-white bg-[length:200%_100%]" />)}</div>; }
function sortNewest(a: SecurityEvent, b: SecurityEvent): number { return new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(); }
function sortOldest(a: SecurityEvent, b: SecurityEvent): number { return sortNewest(b, a); }
function rangeStart(range: SecurityMonitorRange): number { return Date.now() - (range === "24h" ? 24 : range === "7d" ? 7 * 24 : 30 * 24) * 60 * 60 * 1000; }
function outcomeLabel(outcome: string): string { return outcome === "blocked" ? "DIBLOKIR" : outcome === "detected" ? "TERDETEKSI" : outcome === "breach" ? "BREACH" : outcome.toUpperCase(); }
function outcomeTone(outcome: string): string { return outcome === "blocked" ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200" : outcome === "detected" ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200" : outcome === "breach" ? "bg-red-50 text-red-700 ring-1 ring-red-200" : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"; }
function eventMeta(event: SecurityEvent): { label: string; source: string; icon: JSX.Element; tone: string } { if (event.source === "vault_core") return { label: "Vault Core menolak operasi", source: "Vault Core", icon: <ShieldCheck className="h-5 w-5" aria-hidden="true" />, tone: "bg-amber-50 text-amber-700" }; if (event.source === "security_lab") return { label: "Security Lab", source: "Security Lab", icon: <ShieldAlert className="h-5 w-5" aria-hidden="true" />, tone: "bg-brand-sky text-brand-steel" }; if (event.event_type === "RATE_LIMIT_BLOCKED") return { label: "Rate limit memblokir request", source: "API Service", icon: <AlertTriangle className="h-5 w-5" aria-hidden="true" />, tone: "bg-red-50 text-red-700" }; if (event.event_type === "FAILED_LOGIN") return { label: "Login gagal", source: "API Service", icon: <XCircle className="h-5 w-5" aria-hidden="true" />, tone: "bg-red-50 text-red-700" }; return { label: "Akses API ditolak", source: "API Service", icon: <Clock3 className="h-5 w-5" aria-hidden="true" />, tone: "bg-brand-sky text-brand-steel" }; }
function connectionLabel(connection: string): string { return connection === "live" ? "LIVE" : connection === "reconnecting" ? "Menyambungkan ulang" : connection === "connecting" ? "Menyambungkan" : connection === "error" ? "Stream bermasalah" : "Tidak aktif"; }
function connectionTone(connection: string): string { return connection === "live" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : connection === "error" ? "bg-red-50 text-red-700 ring-1 ring-red-200" : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"; }
