import { useMemo } from "react";
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
import { BarChart3, Database, FileText, Gauge, Trash2 } from "lucide-react";
import { formatBytes, formatCount, formatDate } from "@/shared/lib/format";
import type { UserInsight } from "@/shared/types/insights";
import { CHART, rangeLabel, shortDate } from "@/pages/dashboard/insights/_lib/insightDisplay";
import { InsightChartPanel } from "@/pages/dashboard/insights/_components/InsightChartPanel";
import { InsightListItem } from "@/pages/dashboard/insights/_components/InsightListItem";
import { InsightListPanel } from "@/pages/dashboard/insights/_components/InsightListPanel";
import { InsightMetricCard } from "@/pages/dashboard/insights/_components/InsightMetricCard";

type InsightContentProps = {
    insight: UserInsight;
};

export function InsightContent({ insight }: InsightContentProps): JSX.Element {
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
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" data-tour="insight-metrics">
                <InsightMetricCard
                    label="Item aktif"
                    value={formatCount(totalItems, "item")}
                    helper={`${formatCount(summary.active_files, "berkas")}, ${formatCount(summary.active_folders, "direktori")}`}
                    icon={<FileText className="h-5 w-5" />}
                />
                <InsightMetricCard
                    label="Penyimpanan"
                    value={formatBytes(summary.active_storage_bytes)}
                    helper={formatBytes(summary.trash_storage_bytes) + " berada di Sampah"}
                    icon={<Database className="h-5 w-5" />}
                />
                <InsightMetricCard
                    label="Efisiensi"
                    value={(summary.dedup_ratio * 100).toFixed(2) + "%"}
                    helper={`${formatCount(summary.reuse_chunks, "chunk")} dari ${formatCount(summary.total_chunks, "chunk")} digunakan ulang`}
                    icon={<Gauge className="h-5 w-5" />}
                />
                <InsightMetricCard
                    label="Item berbintang"
                    value={formatCount(totalStarred, "item")}
                    helper={`${formatCount(totalTrash, "item")} berada di Sampah`}
                    icon={<Trash2 className="h-5 w-5" />}
                />
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(20rem,0.9fr)]">
                <InsightChartPanel title="Aktivitas Anda" description={"Pergerakan berkas selama " + rangeLabel(insight.range) + " terakhir."}>
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
                </InsightChartPanel>

                <InsightChartPanel title="Efisiensi Chunk" description="Perbandingan data baru dan data yang berhasil digunakan ulang.">
                    <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={actionTotals} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={CHART.line} />
                            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: CHART.steel }} />
                            <YAxis type="category" dataKey="label" tick={{ fontSize: 12, fill: CHART.steel }} width={90} />
                            <Tooltip />
                            <Bar dataKey="value" fill={CHART.amber} radius={[0, 12, 12, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </InsightChartPanel>
            </section>

            <section className="grid gap-6 xl:grid-cols-3">
                <InsightListPanel
                    title="Berkas terbesar"
                    empty="Belum ada berkas aktif."
                    emptyIcon={<FileText className="h-5 w-5" />}
                >
                    {insight.largest_files.map((file) => (
                        <InsightListItem
                            key={file.id}
                            icon={<FileText className="h-4 w-4" />}
                            title={file.name}
                            meta={formatBytes(file.size_bytes) + " · " + (file.mime_type || "berkas")}
                        />
                    ))}
                </InsightListPanel>
                <InsightListPanel
                    title="Sampah paling lama"
                    empty="Sampah masih kosong."
                    emptyIcon={<Trash2 className="h-5 w-5" />}
                >
                    {insight.trash_items.map((item) => (
                        <InsightListItem
                            key={item.kind + "-" + item.id}
                            icon={<Trash2 className="h-4 w-4" />}
                            title={item.name}
                            meta={(item.kind === "folder" ? "Direktori" : "Berkas") + " · " + formatDate(item.deleted_at)}
                        />
                    ))}
                </InsightListPanel>
                <InsightListPanel
                    title="Tipe berkas"
                    empty="Belum ada komposisi tipe berkas."
                    emptyIcon={<BarChart3 className="h-5 w-5" />}
                >
                    {insight.file_types.map((item) => (
                        <InsightListItem
                            key={item.type}
                            icon={<BarChart3 className="h-4 w-4" />}
                            title={item.type}
                            meta={item.count + " berkas · " + formatBytes(item.total_bytes)}
                        />
                    ))}
                </InsightListPanel>
            </section>
        </>
    );
}
