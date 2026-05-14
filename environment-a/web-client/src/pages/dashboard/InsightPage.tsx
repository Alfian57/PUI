import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { BarChart3, Database, Download, FileArchive, FileText, Sparkles, Trash2, UploadCloud } from "lucide-react";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import { getUserInsight, type InsightRange } from "@/features/insights/api/insightApi";
import { downloadUserInsightReport, type ReportFormat } from "@/features/reports/api/reportApi";
import { useNoticeCenter } from "@/shared/contexts/NoticeProvider";
import { queryKeys } from "@/shared/lib/queryKeys";
import { formatBytes, formatDate } from "@/shared/lib/format";
import { Button } from "@/shared/ui/Button";
import type { UserInsight } from "@/shared/types/domain";

const RANGE_OPTIONS: Array<{ value: InsightRange; label: string }> = [
    { value: "7d", label: "7 hari" },
    { value: "30d", label: "30 hari" },
    { value: "90d", label: "90 hari" }
];

const CHART = {
    ink: "#061B3A",
    amber: "#F0A000",
    success: "#16856E",
    coral: "#D94A35",
    steel: "#24486B",
    line: "#D7E4F2"
} as const;

export function InsightPage(): JSX.Element {
    const [range, setRange] = useState<InsightRange>("30d");
    const [downloading, setDownloading] = useState<ReportFormat | null>(null);
    const notice = useNoticeCenter();
    const insightQuery = useQuery({
        queryKey: queryKeys.insights.user(range),
        queryFn: () => getUserInsight(range)
    });

    async function handleDownload(format: ReportFormat): Promise<void> {
        setDownloading(format);
        try {
            await downloadUserInsightReport(format, range);
            notice.show({ variant: "success", message: `Laporan ${format.toUpperCase()} berhasil dibuat.` });
        } catch (cause) {
            notice.show({ variant: "error", message: cause instanceof Error ? cause.message : "Laporan belum bisa dibuat." });
        } finally {
            setDownloading(null);
        }
    }

    return (
        <div className="space-y-6">
            <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="font-display text-3xl font-semibold text-brand-ink">Insight</h1>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-brand-steel">
                        Ringkasan penyimpanan pribadi, efisiensi deduplikasi, dan aktivitas berkas Anda.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <RangeTabs range={range} onChange={setRange} />
                    <Button variant="secondary" icon={<FileArchive className="h-4 w-4" aria-hidden="true" />} disabled={Boolean(downloading)} onClick={() => void handleDownload("pdf")}>
                        PDF
                    </Button>
                    <Button variant="secondary" disabled={Boolean(downloading)} onClick={() => void handleDownload("csv")}>
                        CSV
                    </Button>
                </div>
            </section>

            {insightQuery.isLoading ? <InsightSkeleton /> : null}

            {insightQuery.isError ? (
                <section className="rounded-[1.75rem] border border-brand-coral/20 bg-white p-6 text-brand-coral shadow-soft">
                    Insight belum dapat dimuat. Coba ulang beberapa saat lagi.
                </section>
            ) : null}

            {insightQuery.data ? <InsightContent insight={insightQuery.data} /> : null}
        </div>
    );
}

function InsightContent({ insight }: { insight: UserInsight }): JSX.Element {
    const summary = insight.summary;
    const totalItems = summary.active_files + summary.active_folders;
    const totalTrash = summary.trash_files + summary.trash_folders;
    const totalStarred = summary.starred_files + summary.starred_folders;
    const actionTotals = useMemo(() => ([
        { label: "Unggah", value: summary.uploads_in_range },
        { label: "Unduh", value: summary.downloads_in_range },
        { label: "Reuse chunk", value: summary.reuse_chunks },
        { label: "Chunk baru", value: summary.new_chunks }
    ]), [summary]);

    return (
        <>
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Item aktif" value={String(totalItems)} helper={`${summary.active_files} berkas, ${summary.active_folders} direktori`} icon={<FileText className="h-5 w-5" />} />
                <MetricCard label="Penyimpanan" value={formatBytes(summary.active_storage_bytes)} helper={`${formatBytes(summary.trash_storage_bytes)} berada di Sampah`} icon={<Database className="h-5 w-5" />} />
                <MetricCard label="Efisiensi" value={`${(summary.dedup_ratio * 100).toFixed(2)}%`} helper={`${summary.reuse_chunks} dari ${summary.total_chunks} chunk digunakan ulang`} icon={<Sparkles className="h-5 w-5" />} />
                <MetricCard label="Prioritas" value={String(totalStarred)} helper={`${totalTrash} item berada di Sampah`} icon={<Trash2 className="h-5 w-5" />} />
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(20rem,0.9fr)]">
                <ChartPanel title="Aktivitas Anda" description={`Pergerakan berkas selama ${rangeLabel(insight.range)} terakhir.`}>
                    <ResponsiveContainer width="100%" height={320}>
                        <AreaChart data={insight.activity}>
                            <CartesianGrid strokeDasharray="3 3" stroke={CHART.line} />
                            <XAxis dataKey="date" tick={{ fontSize: 12, fill: CHART.steel }} tickFormatter={shortDate} />
                            <YAxis tick={{ fontSize: 12, fill: CHART.steel }} allowDecimals={false} />
                            <Tooltip />
                            <Area type="monotone" dataKey="uploads" name="Unggah" stroke={CHART.ink} fill={CHART.ink} fillOpacity={0.14} />
                            <Area type="monotone" dataKey="downloads" name="Unduh" stroke={CHART.success} fill={CHART.success} fillOpacity={0.14} />
                            <Area type="monotone" dataKey="deletes" name="Hapus" stroke={CHART.coral} fill={CHART.coral} fillOpacity={0.12} />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartPanel>

                <ChartPanel title="Efisiensi Chunk" description="Perbandingan data baru dan data yang berhasil digunakan ulang.">
                    <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={actionTotals} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={CHART.line} />
                            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: CHART.steel }} />
                            <YAxis type="category" dataKey="label" tick={{ fontSize: 12, fill: CHART.steel }} width={90} />
                            <Tooltip />
                            <Bar dataKey="value" fill={CHART.amber} radius={[0, 12, 12, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartPanel>
            </section>

            <section className="grid gap-6 xl:grid-cols-3">
                <ListPanel title="Berkas terbesar" empty="Belum ada berkas aktif.">
                    {insight.largest_files.map((file) => (
                        <ListItem key={file.id} icon={<FileText className="h-4 w-4" />} title={file.name} meta={`${formatBytes(file.size_bytes)} · ${file.mime_type || "berkas"}`} />
                    ))}
                </ListPanel>
                <ListPanel title="Sampah paling lama" empty="Sampah masih kosong.">
                    {insight.trash_items.map((item) => (
                        <ListItem key={`${item.kind}-${item.id}`} icon={<Trash2 className="h-4 w-4" />} title={item.name} meta={`${item.kind === "folder" ? "Direktori" : "Berkas"} · ${formatDate(item.deleted_at)}`} />
                    ))}
                </ListPanel>
                <ListPanel title="Tipe berkas" empty="Belum ada komposisi tipe berkas.">
                    {insight.file_types.map((item) => (
                        <ListItem key={item.type} icon={<BarChart3 className="h-4 w-4" />} title={item.type} meta={`${item.count} berkas · ${formatBytes(item.total_bytes)}`} />
                    ))}
                </ListPanel>
            </section>
        </>
    );
}

function RangeTabs({ range, onChange }: { range: InsightRange; onChange: (range: InsightRange) => void }): JSX.Element {
    return (
        <div className="flex rounded-2xl bg-white p-1 shadow-soft">
            {RANGE_OPTIONS.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    onClick={() => onChange(option.value)}
                    className={clsx(
                        "rounded-xl px-4 py-2 text-sm font-semibold transition",
                        range === option.value ? "bg-brand-ink text-white" : "text-brand-steel hover:bg-brand-sky hover:text-brand-ink"
                    )}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}

function MetricCard({ label, value, helper, icon }: { label: string; value: string; helper: string; icon: JSX.Element }): JSX.Element {
    return (
        <article className="rounded-[1.75rem] border border-brand-steel/10 bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-sm text-brand-steel">{label}</p>
                    <p className="mt-2 truncate font-display text-3xl font-semibold text-brand-ink">{value}</p>
                    <p className="mt-2 text-sm text-brand-steel">{helper}</p>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-sky text-brand-steel">
                    {icon}
                </div>
            </div>
        </article>
    );
}

function ChartPanel({ title, description, children }: { title: string; description: string; children: JSX.Element }): JSX.Element {
    return (
        <section className="rounded-[1.75rem] border border-brand-steel/10 bg-white p-5 shadow-soft">
            <div className="mb-5">
                <h2 className="font-display text-xl font-semibold text-brand-ink">{title}</h2>
                <p className="mt-1 text-sm text-brand-steel">{description}</p>
            </div>
            {children}
        </section>
    );
}

function ListPanel({ title, empty, children }: { title: string; empty: string; children: JSX.Element[] }): JSX.Element {
    return (
        <section className="rounded-[1.75rem] border border-brand-steel/10 bg-white p-5 shadow-soft">
            <h2 className="font-display text-xl font-semibold text-brand-ink">{title}</h2>
            <div className="mt-4 space-y-2">
                {children.length > 0 ? children : <p className="rounded-2xl bg-brand-sky/60 px-4 py-3 text-sm text-brand-steel">{empty}</p>}
            </div>
        </section>
    );
}

function ListItem({ icon, title, meta }: { icon: JSX.Element; title: string; meta: string }): JSX.Element {
    return (
        <div className="flex items-center gap-3 rounded-2xl border border-brand-steel/10 px-3 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-sky text-brand-steel">{icon}</div>
            <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-brand-ink">{title}</p>
                <p className="truncate text-xs text-brand-steel">{meta}</p>
            </div>
        </div>
    );
}

function InsightSkeleton(): JSX.Element {
    return (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-36 animate-pulse rounded-[1.75rem] bg-gradient-to-r from-white via-brand-sky/70 to-white bg-[length:200%_100%]" />
            ))}
        </section>
    );
}

function rangeLabel(range: string): string {
    if (range === "7d") return "7 hari";
    if (range === "90d") return "90 hari";
    return "30 hari";
}

function shortDate(value: string): string {
    return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}
