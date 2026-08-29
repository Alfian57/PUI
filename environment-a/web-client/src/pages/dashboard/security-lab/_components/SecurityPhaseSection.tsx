import type { SecurityLabEvent, SecurityPhase } from "@/pages/dashboard/security-lab/_types/securityLab";
import { PHASE_LABELS } from "@/pages/dashboard/security-lab/_types/securityLab";
import { SecurityEventRow } from "@/pages/dashboard/security-lab/_components/SecurityEventRow";

type SecurityPhaseSectionProps = {
    phase: SecurityPhase;
    events: SecurityLabEvent[];
};

export function SecurityPhaseSection({ phase, events }: SecurityPhaseSectionProps): JSX.Element | null {
    if (events.length === 0) {
        return null;
    }

    return (
        <section className="space-y-3" data-testid="security-phase" data-phase={phase}>
            <h3 className="font-display text-base font-semibold text-brand-logoBlue">{PHASE_LABELS[phase]}</h3>
            <div className="space-y-2">
                {events.map((event, index) => (
                    <SecurityEventRow key={event.phase + "-" + event.step + "-" + index} event={event} />
                ))}
            </div>
        </section>
    );
}
