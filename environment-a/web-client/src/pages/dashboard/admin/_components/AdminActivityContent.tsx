import { Activity, Download, RotateCcw, Trash2, UploadCloud } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AdminAnalytics } from "@/shared/types/admin";
import { formatCount } from "@/shared/lib/format";
import { ChartPanel } from "@/pages/dashboard/admin/_components/ChartPanel";
import { CompactStat } from "@/pages/dashboard/admin/_components/CompactStat";
import { CHART, rangeLabel, shortDate } from "@/pages/dashboard/admin/_lib/analytics";

export function AdminActivityContent({ analytics }: { analytics: AdminAnalytics }): JSX.Element {
    return (
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
                <CompactStat label="Unggah" value={formatCount(analytics.summary.uploads_in_range, "unggahan")} icon={<UploadCloud className="h-4 w-4" />} />
                <CompactStat label="Unduh" value={formatCount(analytics.summary.downloads_in_range, "unduhan")} icon={<Download className="h-4 w-4" />} />
                <CompactStat label="Dihapus" value={formatCount(analytics.summary.deleted_items_in_range, "item")} icon={<Trash2 className="h-4 w-4" />} />
                <CompactStat label="Dipulihkan" value={formatCount(analytics.summary.restored_items_in_range, "item")} icon={<RotateCcw className="h-4 w-4" />} />
                <CompactStat label="Login" value={formatCount(analytics.activity.reduce((sum, item) => sum + item.logins, 0), "sesi")} icon={<Activity className="h-4 w-4" />} />
            </section>
        </section>
    );
}
