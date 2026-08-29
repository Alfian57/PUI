import { Activity, Download, RotateCcw, Trash2, UploadCloud } from "lucide-react";
import type { AdminAnalytics } from "@/shared/types/admin";
import { formatCount } from "@/shared/lib/format";
import { CompactStat } from "@/pages/dashboard/admin/_components/CompactStat";

export function AnalyticsActionStats({ analytics }: { analytics: AdminAnalytics }): JSX.Element {
    const { summary } = analytics;
    return (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <CompactStat label="Unggah" value={formatCount(summary.uploads_in_range, "unggahan")} icon={<UploadCloud className="h-4 w-4" />} />
            <CompactStat label="Unduh" value={formatCount(summary.downloads_in_range, "unduhan")} icon={<Download className="h-4 w-4" />} />
            <CompactStat label="Dihapus" value={formatCount(summary.deleted_items_in_range, "item")} icon={<Trash2 className="h-4 w-4" />} />
            <CompactStat label="Dipulihkan" value={formatCount(summary.restored_items_in_range, "item")} icon={<RotateCcw className="h-4 w-4" />} />
            <CompactStat label="Login" value={formatCount(analytics.activity.reduce((sum, item) => sum + item.logins, 0), "sesi")} icon={<Activity className="h-4 w-4" />} />
        </section>
    );
}
