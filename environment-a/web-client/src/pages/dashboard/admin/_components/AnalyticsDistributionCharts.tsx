import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FileText, FolderOpen, HardDrive } from "lucide-react";
import type { AdminAnalytics } from "@/shared/types/admin";
import { ChartPanel } from "@/pages/dashboard/admin/_components/ChartPanel";
import { EmptyChartText } from "@/pages/dashboard/admin/_components/EmptyChartText";
import { CHART, CHART_COLORS } from "@/pages/dashboard/admin/_lib/analytics";

export function AnalyticsDistributionCharts({ analytics }: { analytics: AdminAnalytics }): JSX.Element {
    const fileTypePie = analytics.file_types.map((item) => ({ name: item.type, value: item.count }));
    const hasFileTypeData = fileTypePie.length > 0 && fileTypePie.some((item) => item.value > 0);
    const hasSizeBucketData = analytics.size_buckets.length > 0 && analytics.size_buckets.some((item) => item.count > 0);
    const hasDepthData = analytics.depths.length > 0 && analytics.depths.some((item) => item.count > 0);

    return (
        <section className="grid gap-6 xl:grid-cols-3">
            <ChartPanel title="Tipe Berkas" description="Komposisi berkas aktif berdasarkan kategori MIME.">
                {hasFileTypeData ? (
                    <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                            <Pie data={fileTypePie} dataKey="value" nameKey="name" innerRadius={64} outerRadius={96} paddingAngle={3}>
                                {fileTypePie.map((_, index) => <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <EmptyChartText
                        message="Belum ada data tipe berkas."
                        icon={<FileText className="h-5 w-5" />}
                    />
                )}
            </ChartPanel>

            <ChartPanel title="Ukuran Berkas" description="Distribusi ukuran berkas aktif.">
                {hasSizeBucketData ? (
                    <ResponsiveContainer width="100%" height={280}>
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
                        message="Belum ada distribusi ukuran berkas."
                        icon={<HardDrive className="h-5 w-5" />}
                    />
                )}
            </ChartPanel>

            <ChartPanel title="Kedalaman Direktori" description="Sebaran tingkat direktori aktif secara agregat.">
                {hasDepthData ? (
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={analytics.depths}>
                            <CartesianGrid strokeDasharray="3 3" stroke={CHART.line} />
                            <XAxis dataKey="depth" tick={{ fontSize: 12, fill: CHART.steel }} />
                            <YAxis tick={{ fontSize: 12, fill: CHART.steel }} allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="count" name="Direktori" fill={CHART.success} radius={[12, 12, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <EmptyChartText
                        message="Belum ada data kedalaman direktori."
                        icon={<FolderOpen className="h-5 w-5" />}
                    />
                )}
            </ChartPanel>
        </section>
    );
}
