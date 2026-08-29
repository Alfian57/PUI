import clsx from "clsx";
import { Radio } from "lucide-react";
import type { SecurityMonitorConnection } from "@/pages/dashboard/admin/security-monitoring/_hooks/useSecurityMonitorStream";
import { connectionLabel, connectionTone } from "@/pages/dashboard/admin/_lib/securityMonitoring";

type SecurityMonitorHeaderProps = {
    connection: SecurityMonitorConnection;
    streamError: string | null;
};

export function SecurityMonitorHeader({ connection, streamError }: SecurityMonitorHeaderProps): JSX.Element {
    return (
        <>
            <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="font-display text-[11px] uppercase tracking-[0.24em] text-brand-steel">Operasional</p>
                    <h1 className="mt-1 font-display text-3xl font-semibold text-brand-logoBlue">Monitoring Keamanan</h1>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-brand-steel">Bukti event keamanan API, Vault Core, dan Security Lab. Histori disimpan selama 30 hari dan diperbarui saat serangan berlangsung.</p>
                </div>
                <div className={clsx("inline-flex items-center gap-2 self-start rounded-full px-3 py-2 text-xs font-semibold lg:self-auto", connectionTone(connection))} data-testid="security-monitor-connection">
                    <Radio className={clsx("h-4 w-4", connection === "live" && "animate-pulse")} aria-hidden="true" />
                    {connectionLabel(connection)}
                </div>
            </header>
            {streamError ? <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">{streamError} Histori tetap dapat dimuat.</p> : null}
        </>
    );
}
