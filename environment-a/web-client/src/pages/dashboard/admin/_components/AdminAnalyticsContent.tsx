import type { AdminAnalytics } from "@/shared/types/admin";
import { formatDate } from "@/shared/lib/format";
import { AdminAnalyticsMetrics } from "@/pages/dashboard/admin/_components/AdminAnalyticsMetrics";
import { AnalyticsActionStats } from "@/pages/dashboard/admin/_components/AnalyticsActionStats";
import { AnalyticsDistributionCharts } from "@/pages/dashboard/admin/_components/AnalyticsDistributionCharts";
import { AnalyticsOverviewCharts } from "@/pages/dashboard/admin/_components/AnalyticsOverviewCharts";

export function AdminAnalyticsContent({ analytics }: { analytics: AdminAnalytics }): JSX.Element {
    return (
        <>
            <AdminAnalyticsMetrics summary={analytics.summary} />
            <AnalyticsOverviewCharts analytics={analytics} />
            <AnalyticsDistributionCharts analytics={analytics} />
            <AnalyticsActionStats analytics={analytics} />
            <p className="text-xs text-brand-steel">
                Diperbarui {formatDate(analytics.generated_at)}. Data ditampilkan agregat untuk menjaga privasi pengguna.
            </p>
        </>
    );
}
