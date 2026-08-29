import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Database, FileText, HardDrive, Recycle, Trash2 } from "lucide-react";
import type { AdminAnalytics } from "@/shared/types/admin";
import { formatBytes, formatCount } from "@/shared/lib/format";
import { ChartPanel } from "@/pages/dashboard/admin/_components/ChartPanel";
import { EmptyChartText } from "@/pages/dashboard/admin/_components/EmptyChartText";
import { MetricCard } from "@/pages/dashboard/admin/_components/MetricCard";
import { CHART } from "@/pages/dashboard/admin/_lib/analytics";

export function AdminStorageContent({ analytics }: { analytics: AdminAnalytics }): JSX.Element {
    const { summary } = analytics;
    const hasFileTypeData = analytics.file_types.length > 0 && analytics.file_types.some((item) => item.count > 0);
    const hasSizeBucketData = analytics.size_buckets.length > 0 && analytics.size_buckets.some((item) => item.count > 0);

    return (
        <>
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Storage aktif" value={formatBytes(summary.active_storage_bytes)} helper={`${formatCount(summary.active_files, "berkas")} aktif`} icon={<Database className="h-5 w-5" />} />
                <MetricCard label="Storage Sampah" value={formatBytes(summary.trash_storage_bytes)} helper={`${formatCount(summary.trash_files, "berkas")}, ${formatCount(summary.trash_folders, "direktori")}`} icon={<Trash2 className="h-5 w-5" />} />
                <MetricCard label="Chunk digunakan ulang" value={formatCount(summary.reuse_chunks, "chunk")} helper={`Total ${formatCount(summary.total_chunks, "chunk")} pada berkas aktif`} icon={<Recycle className="h-5 w-5" />} />
                <MetricCard label="Efisiensi deduplikasi" value={`${(summary.dedup_ratio * 100).toFixed(2)}%`} helper={`${formatCount(summary.reuse_chunks, "chunk")} dari ${formatCount(summary.total_chunks, "chunk")} digunakan ulang`} icon={<HardDrive className="h-5 w-5" />} />
            </section>
            <section className="grid gap-6 xl:grid-cols-2">
                <ChartPanel title="Tipe Berkas" description="Komposisi berkas aktif berdasarkan kategori MIME.">
                    {hasFileTypeData ? (
                        <ResponsiveContainer width="100%" height={320}>
                            <BarChart data={analytics.file_types}>
                                <CartesianGrid strokeDasharray="3 3" stroke={CHART.line} />
                                <XAxis dataKey="type" tick={{ fontSize: 12, fill: CHART.steel }} />
                                <YAxis tick={{ fontSize: 12, fill: CHART.steel }} allowDecimals={false} />
                                <Tooltip />
                                <Bar dataKey="count" name="Berkas" fill={CHART.ink} radius={[12, 12, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <EmptyChartText
                            height={320}
                            message="Belum ada data tipe berkas."
                            icon={<FileText className="h-5 w-5" />}
                        />
                    )}
                </ChartPanel>
                <ChartPanel title="Ukuran Berkas" description="Distribusi ukuran berkas aktif.">
                    {hasSizeBucketData ? (
                        <ResponsiveContainer width="100%" height={320}>
                            <BarChart data={analytics.size_buckets}>
                                <CartesianGrid strokeDasharray="3 3" stroke={CHART.line} />
                                <XAxis dataKey="bucket" tick={{ fontSize: 12, fill: CHART.steel }} />
                                <YAxis tick={{ fontSize: 12, fill: CHART.steel }} allowDecimals={false} />
                                <Tooltip />
                                <Bar dataKey="count" name="Berkas" fill={CHART.amber} radius={[12, 12, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <EmptyChartText
                            height={320}
                            message="Belum ada distribusi ukuran berkas."
                            icon={<HardDrive className="h-5 w-5" />}
                        />
                    )}
                </ChartPanel>
            </section>
        </>
    );
}
