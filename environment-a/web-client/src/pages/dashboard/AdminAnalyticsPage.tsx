import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import {
    Activity,
    Database,
    Download,
    FileArchive,
    FileText,
    HardDrive,
    RotateCcw,
    Server,
    Sparkles,
    Trash2,
    UploadCloud,
    UsersRound
} from "lucide-react";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import { getAdminAnalytics, getAdminSystemStatus, type AdminAnalyticsRange } from "@/features/admin/api/adminApi";
import { downloadAdminAnalyticsReport, type ReportFormat } from "@/features/reports/api/reportApi";
import { useNoticeCenter } from "@/shared/contexts/NoticeProvider";
import { queryKeys } from "@/shared/lib/queryKeys";
import { formatBytes, formatDate } from "@/shared/lib/format";
import { Button } from "@/shared/ui/Button";
import type { AdminAnalytics } from "@/shared/types/domain";

const RANGE_OPTIONS: Array<{ value: AdminAnalyticsRange; label: string }> = [
    { value: "7d", label: "7 hari" },
    { value: "30d", label: "30 hari" },
    { value: "90d", label: "90 hari" }
];

const CHART = {
    ink: "#042351",
    amber: "#F79C05",
    success: "#16856E",
    coral: "#D94A35",
    steel: "#24486B",
    blueprint: "#476C9B",
    line: "#D7E4F2"
} as const;

const CHART_COLORS = [CHART.ink, CHART.amber, CHART.success, CHART.coral, CHART.steel, CHART.blueprint];

export function AdminAnalyticsPage(): JSX.Element {
    const [range, setRange] = useState<AdminAnalyticsRange>("30d");
    const analyticsQuery = useQuery({
        queryKey: queryKeys.admin.analytics(range),
        queryFn: () => getAdminAnalytics(range)
    });
    const analytics = analyticsQuery.data;

    return (
        <div className="space-y-6">
            <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between" data-tour="admin-analytics-header">
                <div>
                    <h1 className="font-display text-3xl font-semibold text-brand-logoBlue">Analitik HashBox</h1>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-brand-steel">
                        Ringkasan penggunaan aplikasi secara agregat tanpa membuka identitas pengguna, nama berkas, atau struktur direktori pribadi.
                    </p>
                </div>
                <div className="flex rounded-2xl bg-white p-1 shadow-soft">
                    {RANGE_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => setRange(option.value)}
                            className={clsx(
                                "rounded-xl px-4 py-2 text-sm font-semibold transition",
                                range === option.value ? "bg-brand-logoBlue text-white" : "text-brand-steel hover:bg-brand-sky hover:text-brand-logoBlue"
                            )}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </section>

            {analyticsQuery.isLoading ? <AdminAnalyticsSkeleton /> : null}

            {analyticsQuery.isError ? (
                <section className="rounded-[1.75rem] border border-brand-coral/20 bg-white p-6 text-brand-coral shadow-soft">
                    Analitik belum dapat dimuat. Coba ulang beberapa saat lagi.
                </section>
            ) : null}

            {analytics ? <AdminAnalyticsContent analytics={analytics} /> : null}
        </div>
    );
}

function AdminAnalyticsContent({ analytics }: { analytics: AdminAnalytics }): JSX.Element {
    const summary = analytics.summary;
    const totalStarred = summary.starred_files + summary.starred_folders;
    const totalActiveItems = summary.active_files + summary.active_folders;
    const fileTypePie = analytics.file_types.map((item) => ({
        name: item.type,
        value: item.count
    }));

    const actionTotals = useMemo(() => ([
        { label: "Unggah", value: summary.uploads_in_range },
        { label: "Unduh", value: summary.downloads_in_range },
        { label: "Hapus", value: summary.deleted_items_in_range },
        { label: "Pulihkan", value: summary.restored_items_in_range },
        { label: "Bintang", value: summary.starred_actions_in_range }
    ]), [summary]);

    return (
        <>
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" data-tour="admin-analytics-metrics">
                <MetricCard label="Pengguna" value={String(summary.total_users)} helper={`${summary.active_users} aktif`} icon={<UsersRound className="h-5 w-5" />} />
                <MetricCard label="Item aktif" value={String(totalActiveItems)} helper={`${summary.active_files} berkas, ${summary.active_folders} direktori`} icon={<HardDrive className="h-5 w-5" />} />
                <MetricCard label="Penyimpanan aktif" value={formatBytes(summary.active_storage_bytes)} helper={`${formatBytes(summary.trash_storage_bytes)} di Sampah`} icon={<Database className="h-5 w-5" />} />
                <MetricCard label="Efisiensi" value={`${(summary.dedup_ratio * 100).toFixed(2)}%`} helper={`${summary.reuse_chunks} chunk digunakan ulang`} icon={<Sparkles className="h-5 w-5" />} />
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,0.9fr)]">
                <ChartPanel title="Tren Aktivitas" description={`Pergerakan aktivitas selama ${rangeLabel(analytics.range)} terakhir.`}>
                    <ResponsiveContainer width="100%" height={320}>
                        <AreaChart data={analytics.activity}>
                            <CartesianGrid strokeDasharray="3 3" stroke={CHART.line} />
                            <XAxis dataKey="date" tick={{ fontSize: 12, fill: CHART.steel }} tickFormatter={shortDate} />
                            <YAxis tick={{ fontSize: 12, fill: CHART.steel }} allowDecimals={false} />
                            <Tooltip labelFormatter={(value) => `Tanggal ${value}`} />
                            <Area type="monotone" dataKey="uploads" name="Unggah" stroke={CHART.ink} fill={CHART.ink} fillOpacity={0.14} />
                            <Area type="monotone" dataKey="downloads" name="Unduh" stroke={CHART.success} fill={CHART.success} fillOpacity={0.14} />
                            <Area type="monotone" dataKey="deletes" name="Hapus" stroke={CHART.coral} fill={CHART.coral} fillOpacity={0.12} />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartPanel>

                <ChartPanel title="Aksi Utama" description="Jumlah aksi penting dalam rentang aktif.">
                    <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={actionTotals} layout="vertical" margin={{ left: 16 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={CHART.line} />
                            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: CHART.steel }} />
                            <YAxis type="category" dataKey="label" tick={{ fontSize: 12, fill: CHART.steel }} width={72} />
                            <Tooltip />
                            <Bar dataKey="value" radius={[0, 12, 12, 0]} fill={CHART.ink} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartPanel>
            </section>

            <section className="grid gap-6 xl:grid-cols-3">
                <ChartPanel title="Tipe Berkas" description="Komposisi berkas aktif berdasarkan kategori MIME.">
                    {fileTypePie.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie data={fileTypePie} dataKey="value" nameKey="name" innerRadius={64} outerRadius={96} paddingAngle={3}>
                                    {fileTypePie.map((_, index) => (
                                        <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <EmptyChartText />}
                </ChartPanel>

                <ChartPanel title="Ukuran Berkas" description="Distribusi ukuran berkas aktif.">
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={analytics.size_buckets}>
                            <CartesianGrid strokeDasharray="3 3" stroke={CHART.line} />
                            <XAxis dataKey="bucket" tick={{ fontSize: 12, fill: CHART.steel }} />
                            <YAxis tick={{ fontSize: 12, fill: CHART.steel }} allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="count" name="Berkas" fill={CHART.amber} radius={[12, 12, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartPanel>

                <ChartPanel title="Kedalaman Direktori" description="Sebaran tingkat direktori aktif secara agregat.">
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={analytics.depths}>
                            <CartesianGrid strokeDasharray="3 3" stroke={CHART.line} />
                            <XAxis dataKey="depth" tick={{ fontSize: 12, fill: CHART.steel }} />
                            <YAxis tick={{ fontSize: 12, fill: CHART.steel }} allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="count" name="Direktori" fill={CHART.success} radius={[12, 12, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartPanel>
            </section>

            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <CompactStat label="Unggah" value={summary.uploads_in_range} icon={<UploadCloud className="h-4 w-4" />} />
                <CompactStat label="Unduh" value={summary.downloads_in_range} icon={<Download className="h-4 w-4" />} />
                <CompactStat label="Dihapus" value={summary.deleted_items_in_range} icon={<Trash2 className="h-4 w-4" />} />
                <CompactStat label="Dipulihkan" value={summary.restored_items_in_range} icon={<RotateCcw className="h-4 w-4" />} />
                <CompactStat label="Login" value={analytics.activity.reduce((sum, item) => sum + item.logins, 0)} icon={<Activity className="h-4 w-4" />} />
            </section>

            <p className="text-xs text-brand-steel">
                Diperbarui {formatDate(analytics.generated_at)}. Data ditampilkan agregat untuk menjaga privasi pengguna.
            </p>
        </>
    );
}

export function AdminStoragePage(): JSX.Element {
    const [range, setRange] = useState<AdminAnalyticsRange>("30d");
    const analyticsQuery = useQuery({
        queryKey: queryKeys.admin.analytics(range),
        queryFn: () => getAdminAnalytics(range)
    });
    const analytics = analyticsQuery.data;

    return (
        <div className="space-y-6">
            <AdminPageHeader
                title="Penyimpanan"
                description="Pantau kapasitas aktif, Sampah, chunk deduplikasi, dan komposisi berkas secara agregat."
                range={range}
                onRangeChange={setRange}
            />
            {analytics ? (
                <>
                    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <MetricCard label="Storage aktif" value={formatBytes(analytics.summary.active_storage_bytes)} helper={`${analytics.summary.active_files} berkas aktif`} icon={<Database className="h-5 w-5" />} />
                        <MetricCard label="Storage Sampah" value={formatBytes(analytics.summary.trash_storage_bytes)} helper={`${analytics.summary.trash_files + analytics.summary.trash_folders} item`} icon={<Trash2 className="h-5 w-5" />} />
                        <MetricCard label="Chunk reuse" value={String(analytics.summary.reuse_chunks)} helper={`${analytics.summary.total_chunks} total chunk`} icon={<Sparkles className="h-5 w-5" />} />
                        <MetricCard label="Efisiensi" value={`${(analytics.summary.dedup_ratio * 100).toFixed(2)}%`} helper="Rasio chunk yang digunakan ulang" icon={<HardDrive className="h-5 w-5" />} />
                    </section>
                    <section className="grid gap-6 xl:grid-cols-2">
                        <ChartPanel title="Tipe Berkas" description="Komposisi berkas aktif berdasarkan kategori MIME.">
                            <ResponsiveContainer width="100%" height={320}>
                                <BarChart data={analytics.file_types}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.line} />
                                    <XAxis dataKey="type" tick={{ fontSize: 12, fill: CHART.steel }} />
                                    <YAxis tick={{ fontSize: 12, fill: CHART.steel }} allowDecimals={false} />
                                    <Tooltip />
                                    <Bar dataKey="count" name="Berkas" fill={CHART.ink} radius={[12, 12, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartPanel>
                        <ChartPanel title="Ukuran Berkas" description="Distribusi ukuran berkas aktif.">
                            <ResponsiveContainer width="100%" height={320}>
                                <BarChart data={analytics.size_buckets}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.line} />
                                    <XAxis dataKey="bucket" tick={{ fontSize: 12, fill: CHART.steel }} />
                                    <YAxis tick={{ fontSize: 12, fill: CHART.steel }} allowDecimals={false} />
                                    <Tooltip />
                                    <Bar dataKey="count" name="Berkas" fill={CHART.amber} radius={[12, 12, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartPanel>
                    </section>
                </>
            ) : analyticsQuery.isLoading ? <AdminAnalyticsSkeleton /> : <ErrorPanel />}
        </div>
    );
}

export function AdminActivityAnalyticsPage(): JSX.Element {
    const [range, setRange] = useState<AdminAnalyticsRange>("30d");
    const analyticsQuery = useQuery({
        queryKey: queryKeys.admin.analytics(range),
        queryFn: () => getAdminAnalytics(range)
    });
    const analytics = analyticsQuery.data;

    return (
        <div className="space-y-6">
            <AdminPageHeader
                title="Aktivitas"
                description="Lihat tren login, upload, download, hapus, pulihkan, dan bintang secara agregat."
                range={range}
                onRangeChange={setRange}
            />
            {analytics ? (
                <section className="grid gap-6">
                    <ChartPanel title="Tren Aktivitas" description={`Pergerakan aktivitas selama ${rangeLabel(analytics.range)} terakhir.`}>
                        <ResponsiveContainer width="100%" height={380}>
                            <AreaChart data={analytics.activity}>
                                <CartesianGrid strokeDasharray="3 3" stroke={CHART.line} />
                                <XAxis dataKey="date" tick={{ fontSize: 12, fill: CHART.steel }} tickFormatter={shortDate} />
                                <YAxis tick={{ fontSize: 12, fill: CHART.steel }} allowDecimals={false} />
                                <Tooltip />
                                <Area type="monotone" dataKey="logins" name="Login" stroke={CHART.blueprint} fill={CHART.blueprint} fillOpacity={0.12} />
                                <Area type="monotone" dataKey="uploads" name="Unggah" stroke={CHART.ink} fill={CHART.ink} fillOpacity={0.14} />
                                <Area type="monotone" dataKey="downloads" name="Unduh" stroke={CHART.success} fill={CHART.success} fillOpacity={0.14} />
                                <Area type="monotone" dataKey="deletes" name="Hapus" stroke={CHART.coral} fill={CHART.coral} fillOpacity={0.12} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartPanel>
                    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                        <CompactStat label="Unggah" value={analytics.summary.uploads_in_range} icon={<UploadCloud className="h-4 w-4" />} />
                        <CompactStat label="Unduh" value={analytics.summary.downloads_in_range} icon={<Download className="h-4 w-4" />} />
                        <CompactStat label="Dihapus" value={analytics.summary.deleted_items_in_range} icon={<Trash2 className="h-4 w-4" />} />
                        <CompactStat label="Dipulihkan" value={analytics.summary.restored_items_in_range} icon={<RotateCcw className="h-4 w-4" />} />
                        <CompactStat label="Login" value={analytics.activity.reduce((sum, item) => sum + item.logins, 0)} icon={<Activity className="h-4 w-4" />} />
                    </section>
                </section>
            ) : analyticsQuery.isLoading ? <AdminAnalyticsSkeleton /> : <ErrorPanel />}
        </div>
    );
}

export function AdminSystemPage(): JSX.Element {
    const systemQuery = useQuery({
        queryKey: queryKeys.admin.system,
        queryFn: getAdminSystemStatus
    });
    const system = systemQuery.data;

    return (
        <div className="space-y-6">
            <section>
                <h1 className="font-display text-3xl font-semibold text-brand-logoBlue">Kesehatan Sistem</h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-brand-steel">
                    Status layanan utama HashBox tanpa membuka data pribadi pengguna.
                </p>
            </section>
            {system ? (
                <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard label="Aplikasi" value={statusLabel(system.status)} helper={`Diperiksa ${formatDate(system.checked_at)}`} icon={<Server className="h-5 w-5" />} />
                    <MetricCard label="Database" value={statusLabel(system.database)} helper="Metadata dan sesi pengguna" icon={<Database className="h-5 w-5" />} />
                    <MetricCard label="Vault Core" value={statusLabel(system.vault_core)} helper="Penyimpanan immutable" icon={<HardDrive className="h-5 w-5" />} />
                    <MetricCard label="Batas unggah" value={formatBytes(system.max_upload_size_bytes)} helper={`${system.rate_limit_per_minute} permintaan per menit`} icon={<UploadCloud className="h-5 w-5" />} />
                </section>
            ) : systemQuery.isLoading ? <AdminAnalyticsSkeleton /> : <ErrorPanel />}
        </div>
    );
}

export function AdminReportsPage(): JSX.Element {
    const [range, setRange] = useState<AdminAnalyticsRange>("30d");
    const [downloading, setDownloading] = useState<ReportFormat | null>(null);
    const notice = useNoticeCenter();

    async function handleDownload(format: ReportFormat): Promise<void> {
        setDownloading(format);
        try {
            await downloadAdminAnalyticsReport(format, range);
            notice.show({ variant: "success", message: `Laporan ${format.toUpperCase()} berhasil dibuat.` });
        } catch (cause) {
            notice.show({ variant: "error", message: cause instanceof Error ? cause.message : "Laporan belum bisa dibuat." });
        } finally {
            setDownloading(null);
        }
    }

    return (
        <div className="space-y-6">
            <AdminPageHeader
                title="Laporan"
                description="Unduh laporan analitik agregat untuk dokumentasi tanpa data pribadi pengguna."
                range={range}
                onRangeChange={setRange}
            />
            <section className="grid gap-4 md:grid-cols-2">
                <article className="rounded-[1.75rem] bg-white p-6 shadow-soft ring-1 ring-brand-line/70">
                    <FileArchive className="h-8 w-8 text-brand-steel" aria-hidden="true" />
                    <h2 className="mt-4 font-display text-xl font-semibold text-brand-logoBlue">Laporan PDF</h2>
                    <p className="mt-2 text-sm leading-6 text-brand-steel">Ringkasan siap baca untuk lampiran, demo, atau dokumentasi evaluasi.</p>
                    <Button className="mt-5" disabled={Boolean(downloading)} onClick={() => void handleDownload("pdf")}>
                        {downloading === "pdf" ? "Membuat..." : "Unduh PDF"}
                    </Button>
                </article>
                <article className="rounded-[1.75rem] bg-white p-6 shadow-soft ring-1 ring-brand-line/70">
                    <FileText className="h-8 w-8 text-brand-steel" aria-hidden="true" />
                    <h2 className="mt-4 font-display text-xl font-semibold text-brand-logoBlue">Laporan CSV</h2>
                    <p className="mt-2 text-sm leading-6 text-brand-steel">Data tabular untuk pengecekan ulang dan pengolahan sederhana.</p>
                    <Button className="mt-5" variant="secondary" disabled={Boolean(downloading)} onClick={() => void handleDownload("csv")}>
                        {downloading === "csv" ? "Membuat..." : "Unduh CSV"}
                    </Button>
                </article>
            </section>
        </div>
    );
}

function AdminPageHeader({
    title,
    description,
    range,
    onRangeChange
}: {
    title: string;
    description: string;
    range: AdminAnalyticsRange;
    onRangeChange: (range: AdminAnalyticsRange) => void;
}): JSX.Element {
    return (
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
                <h1 className="font-display text-3xl font-semibold text-brand-logoBlue">{title}</h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-brand-steel">{description}</p>
            </div>
            <div className="flex rounded-2xl bg-white p-1 shadow-soft">
                {RANGE_OPTIONS.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => onRangeChange(option.value)}
                        className={clsx(
                            "rounded-xl px-4 py-2 text-sm font-semibold transition",
                            range === option.value ? "bg-brand-logoBlue text-white" : "text-brand-steel hover:bg-brand-sky hover:text-brand-logoBlue"
                        )}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </section>
    );
}

function ErrorPanel(): JSX.Element {
    return (
        <section className="rounded-[1.75rem] border border-brand-coral/20 bg-white p-6 text-brand-coral shadow-soft">
            Data belum dapat dimuat. Coba ulang beberapa saat lagi.
        </section>
    );
}

function statusLabel(status: string): string {
    if (status === "ok") return "Normal";
    if (status === "degraded") return "Terganggu";
    return "Perlu dicek";
}

type MetricCardProps = {
    label: string;
    value: string;
    helper: string;
    icon: JSX.Element;
};

function MetricCard({ label, value, helper, icon }: MetricCardProps): JSX.Element {
    return (
        <article className="rounded-[1.75rem] bg-white p-5 shadow-soft ring-1 ring-brand-line/70">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-sm text-brand-steel">{label}</p>
                    <p className="mt-2 truncate font-display text-3xl font-semibold text-brand-logoBlue">{value}</p>
                    <p className="mt-2 text-sm text-brand-steel">{helper}</p>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-sky text-brand-steel">
                    {icon}
                </div>
            </div>
        </article>
    );
}

type ChartPanelProps = {
    title: string;
    description: string;
    children: JSX.Element;
};

function ChartPanel({ title, description, children }: ChartPanelProps): JSX.Element {
    return (
        <section className="rounded-[1.75rem] bg-white p-5 shadow-soft ring-1 ring-brand-line/70">
            <div className="mb-5">
                <h2 className="font-display text-xl font-semibold text-brand-logoBlue">{title}</h2>
                <p className="mt-1 text-sm text-brand-steel">{description}</p>
            </div>
            {children}
        </section>
    );
}

function CompactStat({ label, value, icon }: { label: string; value: number; icon: JSX.Element }): JSX.Element {
    return (
        <article className="flex items-center gap-3 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-brand-line/70">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-sky text-brand-steel">
                {icon}
            </div>
            <div>
                <p className="text-sm text-brand-steel">{label}</p>
                <p className="font-display text-xl font-semibold text-brand-logoBlue">{value}</p>
            </div>
        </article>
    );
}

function AdminAnalyticsSkeleton(): JSX.Element {
    return (
        <div className="space-y-6">
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-36 animate-pulse rounded-[1.75rem] bg-gradient-to-r from-white via-brand-sky/70 to-white bg-[length:200%_100%]" />
                ))}
            </section>
            <section className="grid gap-6 xl:grid-cols-2">
                {Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="h-96 animate-pulse rounded-[1.75rem] bg-gradient-to-r from-white via-brand-sky/70 to-white bg-[length:200%_100%]" />
                ))}
            </section>
        </div>
    );
}

function EmptyChartText(): JSX.Element {
    return (
        <div className="flex h-[280px] items-center justify-center rounded-2xl bg-brand-sky/55 text-sm text-brand-steel">
            Belum ada data file aktif.
        </div>
    );
}

function shortDate(value: string): string {
    return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

function rangeLabel(range: string): string {
    if (range === "7d") return "7 hari";
    if (range === "90d") return "90 hari";
    return "30 hari";
}
