import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSecurityEvents, getSecurityEventSummary, SECURITY_EVENT_PAGE_SIZE, type SecurityEventFilters, type SecurityMonitorRange } from "@/pages/dashboard/admin/security-monitoring/_api/securityMonitorApi";
import { useSecurityMonitorStream } from "@/pages/dashboard/admin/security-monitoring/_hooks/useSecurityMonitorStream";
import { queryKeys } from "@/shared/lib/queryKeys";
import type { SecurityEvent } from "@/shared/types/security";
import { useLiveSummary } from "@/pages/dashboard/admin/security-monitoring/_hooks/useLiveSummary";
import { rangeStart, sortNewest, sortOldest } from "@/pages/dashboard/admin/_lib/securityMonitoring";
import { parseEnumQueryParam, serializeQueryParam, useQueryParamState } from "@/shared/hooks/useQueryParamState";
import { usePagination } from "@/shared/hooks/usePagination";

const SECURITY_RANGE_OPTIONS = ["24h", "7d", "30d"] as const;

export function useSecurityMonitoringPage() {
    const { value: range, setValue: setRange } = useQueryParamState<SecurityMonitorRange>({
        key: "security[range]",
        defaultValue: "24h",
        parse: parseEnumQueryParam(SECURITY_RANGE_OPTIONS, "24h")
    });
    const { value: eventType, setValue: setEventType } = useQueryParamState<string>({
        key: "security[eventType]",
        defaultValue: "",
        serialize: serializeQueryParam
    });
    const { value: source, setValue: setSource } = useQueryParamState<string>({
        key: "security[source]",
        defaultValue: "",
        serialize: serializeQueryParam
    });
    const { value: outcome, setValue: setOutcome } = useQueryParamState<string>({
        key: "security[outcome]",
        defaultValue: "",
        serialize: serializeQueryParam
    });
    const pagination = usePagination({ queryParam: "security[page]", pageSize: SECURITY_EVENT_PAGE_SIZE });
    const { page, setPage } = pagination;
    const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
    const [selectedRunID, setSelectedRunID] = useState<string | null>(null);
    const { events: liveEvents, connection, error: streamError } = useSecurityMonitorStream(true);

    const filters = useMemo<SecurityEventFilters>(() => ({ range, eventType, source, outcome, limit: pagination.pageSize, offset: pagination.offset }), [eventType, outcome, pagination.offset, pagination.pageSize, range, source]);
    const filterKey = useMemo(() => JSON.stringify(filters), [filters]);
    const eventsQuery = useQuery({ queryKey: queryKeys.admin.securityEvents(filterKey), queryFn: () => getSecurityEvents(filters) });
    const summaryQuery = useQuery({ queryKey: queryKeys.admin.securitySummary(range), queryFn: () => getSecurityEventSummary(range) });
    const runQuery = useQuery({ queryKey: queryKeys.admin.securityEvents(`run:${selectedRunID ?? "none"}`), queryFn: () => getSecurityEvents({ range: "30d", runID: selectedRunID ?? undefined, limit: 100 }), enabled: Boolean(selectedRunID) });
    const historyEvents = eventsQuery.data?.security_events ?? [];
    const historyIDs = useMemo(() => new Set(historyEvents.map((event) => event.id)), [historyEvents]);
    const liveRows = useMemo(() => liveEvents.filter((event) => {
        const isInRange = new Date(event.occurred_at).getTime() >= rangeStart(range);
        const matchesType = !eventType || event.event_type === eventType;
        const matchesSource = !source || event.source === source;
        const matchesOutcome = !outcome || event.outcome === outcome;
        return isInRange && matchesType && matchesSource && matchesOutcome && !historyIDs.has(event.id);
    }), [eventType, historyIDs, liveEvents, outcome, range, source]);
    const rows = useMemo(() => [...liveRows, ...historyEvents].sort(sortNewest).slice(0, pagination.pageSize), [historyEvents, liveRows, pagination.pageSize]);
    const summary = useLiveSummary(summaryQuery.data, liveRows);
    const selectedRunEvents = useMemo(() => (runQuery.data?.security_events ?? []).sort(sortOldest), [runQuery.data]);
    const hasMore = pagination.hasNext(eventsQuery.data?.total ?? 0);

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

    return { range, setRange, eventType, setEventType, source, setSource, outcome, setOutcome, page, setPage, selectedEvent, selectEvent, resetFilters, connection, streamError, summary, summaryLoading: summaryQuery.isLoading, eventsLoading: eventsQuery.isLoading, eventsTotal: eventsQuery.data?.total ?? 0, rows, selectedRunEvents, runLoading: runQuery.isLoading, hasMore };
}
