import { Database, Gauge, HardDrive, UsersRound } from "lucide-react";
import type { AdminAnalyticsSummary } from "@/shared/types/admin";
import { formatBytes, formatCount } from "@/shared/lib/format";
import { MetricCard } from "@/pages/dashboard/admin/_components/MetricCard";

export function AdminAnalyticsMetrics({ summary }: { summary: AdminAnalyticsSummary }): JSX.Element {
    const totalActiveItems = summary.active_files + summary.active_folders;

    return (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" data-tour="admin-analytics-metrics">
            <MetricCard label="Pengguna" value={formatCount(summary.total_users, "pengguna")} helper={`${formatCount(summary.active_users, "pengguna")} aktif`} icon={<UsersRound className="h-5 w-5" />} />
            <MetricCard label="Item aktif" value={formatCount(totalActiveItems, "item")} helper={`${formatCount(summary.active_files, "berkas")}, ${formatCount(summary.active_folders, "direktori")}`} icon={<HardDrive className="h-5 w-5" />} />
            <MetricCard label="Penyimpanan aktif" value={formatBytes(summary.active_storage_bytes)} helper={`${formatBytes(summary.trash_storage_bytes)} di Sampah`} icon={<Database className="h-5 w-5" />} />
            <MetricCard label="Efisiensi deduplikasi" value={`${(summary.dedup_ratio * 100).toFixed(2)}%`} helper={`${formatCount(summary.reuse_chunks, "chunk")} digunakan ulang`} icon={<Gauge className="h-5 w-5" />} />
        </section>
    );
}
