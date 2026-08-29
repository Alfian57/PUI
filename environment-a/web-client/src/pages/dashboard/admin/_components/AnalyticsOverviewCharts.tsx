import { useMemo } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AdminAnalytics } from "@/shared/types/admin";
import { ChartPanel } from "@/pages/dashboard/admin/_components/ChartPanel";
import { CHART, rangeLabel, shortDate } from "@/pages/dashboard/admin/_lib/analytics";

export function AnalyticsOverviewCharts({ analytics }: { analytics: AdminAnalytics }): JSX.Element {
    const actionTotals = useMemo(() => ([
        { label: "Unggah", value: analytics.summary.uploads_in_range },
        { label: "Unduh", value: analytics.summary.downloads_in_range },
        { label: "Hapus", value: analytics.summary.deleted_items_in_range },
        { label: "Pulihkan", value: analytics.summary.restored_items_in_range },
        { label: "Bintang", value: analytics.summary.starred_actions_in_range }
    ]), [analytics.summary]);

    return (
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
    );
}
