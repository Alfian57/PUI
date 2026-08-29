import { useSecurityMonitoringPage } from "@/pages/dashboard/admin/security-monitoring/_hooks/useSecurityMonitoringPage";
import { EventEvidence } from "@/pages/dashboard/admin/security-monitoring/_components/EventEvidence";
import { SecurityEventList } from "@/pages/dashboard/admin/security-monitoring/_components/SecurityEventList";
import { SecurityMonitorFilters } from "@/pages/dashboard/admin/security-monitoring/_components/SecurityMonitorFilters";
import { SecurityMonitorHeader } from "@/pages/dashboard/admin/security-monitoring/_components/SecurityMonitorHeader";
import { SummaryGrid } from "@/pages/dashboard/admin/security-monitoring/_components/SummaryGrid";

export function AdminSecurityMonitoringPage(): JSX.Element {
    const monitoring = useSecurityMonitoringPage();

    return (
        <div className="space-y-6" data-testid="security-monitor-page">
            <SecurityMonitorHeader connection={monitoring.connection} streamError={monitoring.streamError} />
            <SummaryGrid summary={monitoring.summary} loading={monitoring.summaryLoading} />
            <SecurityMonitorFilters range={monitoring.range} eventType={monitoring.eventType} source={monitoring.source} outcome={monitoring.outcome} total={monitoring.eventsTotal} onRangeChange={(value) => { monitoring.setRange(value); monitoring.setPage(0); }} onEventTypeChange={(value) => { monitoring.setEventType(value); monitoring.setPage(0); }} onSourceChange={(value) => { monitoring.setSource(value); monitoring.setPage(0); }} onOutcomeChange={(value) => { monitoring.setOutcome(value); monitoring.setPage(0); }} onReset={monitoring.resetFilters} />
            <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]"><SecurityEventList rows={monitoring.rows} loading={monitoring.eventsLoading} page={monitoring.page} hasMore={monitoring.hasMore} selectedEvent={monitoring.selectedEvent} onSelect={monitoring.selectEvent} onPrevious={() => monitoring.setPage(Math.max(monitoring.page - 1, 0))} onNext={() => monitoring.setPage(monitoring.page + 1)} /><EventEvidence event={monitoring.selectedEvent} runEvents={monitoring.selectedRunEvents} loading={monitoring.runLoading} /></section>
        </div>
    );
}
