import { useMemo } from "react";
import clsx from "clsx";
import { Play, RotateCcw, ShieldCheck, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useSecurityLabStream } from "@/pages/dashboard/security-lab/_hooks/useSecurityLabStream";
import {
    PHASE_ORDER,
    type SecurityLabEvent,
    type SecurityPhase
} from "@/pages/dashboard/security-lab/_types/securityLab";
import { SecurityPhaseSection } from "@/pages/dashboard/security-lab/_components/SecurityPhaseSection";
import { SecuritySummaryCard } from "@/pages/dashboard/security-lab/_components/SecuritySummaryCard";

export function SecurityLabPage(): JSX.Element {
    const { events, summary, state, error, run, reset } = useSecurityLabStream();

    const eventsByPhase = useMemo(() => {
        const grouped: Record<SecurityPhase, SecurityLabEvent[]> = {
            BEFORE: [],
            ATTACK_APP: [],
            PROOF: [],
            ATTACK_UDS: [],
            AFTER: []
        };
        for (const event of events) {
            if (grouped[event.phase]) {
                grouped[event.phase].push(event);
            }
        }
        return grouped;
    }, [events]);

    const running = state === "running";

    return (
        <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6" data-testid="security-lab-page">
            <header className="rounded-[1.75rem] border border-brand-line/70 bg-white p-6 shadow-soft">
                <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-logoBlue text-white">
                        <ShieldCheck className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div>
                        <h1 className="font-display text-2xl font-semibold text-brand-logoBlue">Security Lab</h1>
                        <p className="mt-1 text-sm text-brand-steel">
                            Simulasi mitigasi ransomware yang menguji sistem secara nyata. Skenario mengunggah berkas demo
                            khusus, menyerang lapisan aplikasi, lalu menyerang Vault Core langsung via UDS, dan membuktikan
                            data tetap utuh. Semua nilai di bawah berasal dari respons sistem yang sebenarnya.
                        </p>
                    </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                    <Button
                        onClick={() => void run()}
                        disabled={running}
                        icon={<Play className="h-4 w-4" aria-hidden="true" />}
                        data-testid="security-run"
                    >
                        {running ? "Menjalankan simulasi…" : "Mulai Simulasi Serangan"}
                    </Button>
                    {state === "done" || state === "error" ? (
                        <Button
                            variant="secondary"
                            onClick={reset}
                            icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
                        >
                            Reset
                        </Button>
                    ) : null}
                </div>

                {error ? (
                    <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200" data-testid="security-error">
                        {error}
                    </p>
                ) : null}
            </header>

            {summary ? (
                <section
                    className={clsx(
                        "rounded-[1.75rem] border p-6 shadow-soft",
                        summary.passed ? "border-emerald-200 bg-emerald-50/60" : "border-red-200 bg-red-50/60"
                    )}
                    data-testid="security-summary"
                    data-passed={summary.passed}
                >
                    <div className="flex items-center gap-2">
                        {summary.passed ? (
                            <ShieldCheck className="h-6 w-6 text-emerald-700" aria-hidden="true" />
                        ) : (
                            <ShieldX className="h-6 w-6 text-red-700" aria-hidden="true" />
                        )}
                        <h2 className="font-display text-lg font-semibold text-brand-ink">
                            {summary.passed
                                ? "Semua invariant keamanan terjaga"
                                : "Ada invariant keamanan yang gagal"}
                        </h2>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <SecuritySummaryCard
                            label="Serangan aplikasi berhasil"
                            value={summary.app_layer_compromised ? "Metadata terhapus" : "Tidak"}
                            good={summary.app_layer_compromised}
                        />
                        <SecuritySummaryCard
                            label="Manifest Vault Core"
                            value={summary.vault_manifest_intact ? "Utuh" : "Hilang"}
                            good={summary.vault_manifest_intact}
                        />
                        <SecuritySummaryCard
                            label="Serangan UDS ditolak"
                            value={`${summary.uds_attacks_blocked} dari ${summary.uds_attacks_attempted} serangan`}
                            good={summary.uds_attacks_attempted > 0 && summary.uds_attacks_blocked === summary.uds_attacks_attempted}
                        />
                        <SecuritySummaryCard
                            label="Rekonstruksi byte-to-byte"
                            value={summary.reconstruction_identical ? "Identik" : "Berbeda"}
                            good={summary.reconstruction_identical}
                        />
                        <SecuritySummaryCard
                            label="File hash (awal = akhir)"
                            value={summary.file_hash_before === summary.file_hash_after ? "Cocok" : "Berubah"}
                            good={summary.file_hash_before === summary.file_hash_after}
                        />
                        <SecuritySummaryCard
                            label="Chunk fisik terverifikasi"
                            value={summary.chunks_verified + " chunk"}
                            good={summary.chunks_verified > 0}
                        />
                    </div>
                    <p className="mt-4 break-all rounded-xl bg-white/70 px-3 py-2 font-mono text-xs text-brand-steel">
                        Bukti tersimpan · run_id: {summary.run_id}
                    </p>
                </section>
            ) : null}

            <div className="space-y-6">
                {PHASE_ORDER.map((phase) => (
                    <SecurityPhaseSection key={phase} phase={phase} events={eventsByPhase[phase]} />
                ))}
            </div>

            {events.length === 0 && !running ? (
                <p className="rounded-2xl border border-dashed border-brand-line bg-white/60 px-4 py-8 text-center text-sm text-brand-steel">
                    Belum ada hasil. Klik "Mulai Simulasi Serangan" untuk menjalankan skenario.
                </p>
            ) : null}
        </div>
    );
}
