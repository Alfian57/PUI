import { useMemo } from "react";
import type { SecurityEvent, SecurityEventSummary } from "@/shared/types/security";

export function useLiveSummary(
    summary: SecurityEventSummary | undefined,
    liveEvents: SecurityEvent[]
): SecurityEventSummary | undefined {
    return useMemo(() => {
        if (!summary || liveEvents.length === 0) {
            return summary;
        }

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
