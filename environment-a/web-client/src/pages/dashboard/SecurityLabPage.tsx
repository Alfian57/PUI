import { useMemo } from "react";
import clsx from "clsx";
import { CheckCircle2, Info, Play, RotateCcw, ShieldCheck, ShieldX, XCircle } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { useSecurityLabStream } from "@/features/security-lab/hooks/useSecurityLabStream";
import {
    PHASE_LABELS,
    PHASE_ORDER,
    type SecurityLabEvent,
    type SecurityPhase,
    type SecurityStatus
} from "@/features/security-lab/types";

const STATUS_META: Record<SecurityStatus, { label: string; badge: string; icon: JSX.Element }> = {
    info: {
        label: "INFO",
        badge: "bg-brand-sky text-brand-steel",
        icon: <Info className="h-4 w-4" aria-hidden="true" />
    },
    ok: {
        label: "OK",
        badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
        icon: <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
    },
    blocked: {
        label: "DITOLAK VAULT CORE",
        badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-300",
        icon: <ShieldCheck className="h-4 w-4" aria-hidden="true" />
    },
    breach: {
        label: "PELANGGARAN",
        badge: "bg-red-50 text-red-700 ring-1 ring-red-300",
        icon: <ShieldX className="h-4 w-4" aria-hidden="true" />
    }
};

function formatValue(value: unknown): string {
    if (value === null || value === undefined) {
        return "-";
    }
    if (Array.isArray(value)) {
        return value.map((v) => formatValue(v)).join(", ");
    }
    if (typeof value === "object") {
        return JSON.stringify(value);
    }
    return String(value);
}

function EventRow({ event }: { event: SecurityLabEvent }): JSX.Element {
    const meta = STATUS_META[event.status];
    const dataEntries = event.data ? Object.entries(event.data) : [];

    return (
        <div
            className="rounded-2xl border border-brand-line/70 bg-white p-4 shadow-soft"
            data-testid="security-event"
            data-status={event.status}
        >
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-display text-sm font-semibold text-brand-ink">{event.title}</p>
                <span
                    className={clsx(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-wide",
                        meta.badge
                    )}
                >
                    {meta.icon}
                    {meta.label}
                </span>
            </div>
            {event.detail ? <p className="mt-1 text-sm text-brand-steel">{event.detail}</p> : null}
            {dataEntries.length > 0 ? (
                <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
                    {dataEntries.map(([key, value]) => (
                        <div key={key} className="flex flex-col border-t border-brand-line/50 py-1 sm:flex-row sm:items-baseline sm:gap-2">
                            <dt className="text-xs font-semibold uppercase tracking-wide text-brand-steel/70">{key}</dt>
                            <dd className="break-all font-mono text-xs text-brand-ink">{formatValue(value)}</dd>
                        </div>
                    ))}
                </dl>
            ) : null}
        </div>
    );
}

function PhaseSection({ phase, events }: { phase: SecurityPhase; events: SecurityLabEvent[] }): JSX.Element | null {
    if (events.length === 0) {
        return null;
    }
    return (
        <section className="space-y-3" data-testid="security-phase" data-phase={phase}>
            <h3 className="font-display text-base font-semibold text-brand-logoBlue">{PHASE_LABELS[phase]}</h3>
            <div className="space-y-2">
                {events.map((event, index) => (
                    <EventRow key={`${event.phase}-${event.step}-${index}`} event={event} />
                ))}
            </div>
        </section>
    );
}

function SummaryCard({
    label,
    value,
    good
}: {
    label: string;
    value: string;
    good: boolean;
}): JSX.Element {
    return (
        <div className="rounded-2xl border border-brand-line/70 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-steel/70">{label}</p>
            <p className={clsx("mt-1 flex items-center gap-1.5 text-sm font-semibold", good ? "text-emerald-700" : "text-red-700")}>
                {good ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <XCircle className="h-4 w-4" aria-hidden="true" />}
                {value}
            </p>
        </div>
    );
}

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
                    {(state === "done" || state === "error") && (
                        <Button
                            variant="secondary"
                            onClick={reset}
                            icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
                        >
                            Reset
                        </Button>
                    )}
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
                        <SummaryCard
                            label="Serangan aplikasi berhasil"
                            value={summary.app_layer_compromised ? "Metadata terhapus" : "Tidak"}
                            good={summary.app_layer_compromised}
                        />
                        <SummaryCard
                            label="Manifest Vault Core"
                            value={summary.vault_manifest_intact ? "Utuh" : "Hilang"}
                            good={summary.vault_manifest_intact}
                        />
                        <SummaryCard
                            label="Serangan UDS ditolak"
                            value={`${summary.uds_attacks_blocked}/${summary.uds_attacks_attempted}`}
                            good={summary.uds_attacks_attempted > 0 && summary.uds_attacks_blocked === summary.uds_attacks_attempted}
                        />
                        <SummaryCard
                            label="Rekonstruksi byte-to-byte"
                            value={summary.reconstruction_identical ? "Identik" : "Berbeda"}
                            good={summary.reconstruction_identical}
                        />
                        <SummaryCard
                            label="File hash (awal = akhir)"
                            value={summary.file_hash_before === summary.file_hash_after ? "Cocok" : "Berubah"}
                            good={summary.file_hash_before === summary.file_hash_after}
                        />
                        <SummaryCard
                            label="Chunk fisik terverifikasi"
                            value={`${summary.chunks_verified} chunk`}
                            good={summary.chunks_verified > 0}
                        />
                    </div>
                </section>
            ) : null}

            <div className="space-y-6">
                {PHASE_ORDER.map((phase) => (
                    <PhaseSection key={phase} phase={phase} events={eventsByPhase[phase]} />
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
