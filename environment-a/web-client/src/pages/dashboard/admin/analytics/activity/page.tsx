import { useAdminAnalytics } from "@/pages/dashboard/admin/_hooks/useAdminAnalytics";
import { AdminActivityContent } from "@/pages/dashboard/admin/_components/AdminActivityContent";
import { AdminAnalyticsSkeleton } from "@/pages/dashboard/admin/_components/AdminAnalyticsSkeleton";
import { AdminPageHeader } from "@/pages/dashboard/admin/_components/AdminPageHeader";
import { ErrorPanel } from "@/pages/dashboard/admin/_components/ErrorPanel";

export function AdminActivityAnalyticsPage(): JSX.Element {
    const { range, setRange, analyticsQuery, analytics } = useAdminAnalytics();

    return (
        <div className="space-y-6">
            <AdminPageHeader title="Aktivitas" description="Lihat tren login, upload, download, hapus, pulihkan, dan bintang secara agregat." range={range} onRangeChange={setRange} />
            {analytics ? <AdminActivityContent analytics={analytics} /> : analyticsQuery.isLoading ? <AdminAnalyticsSkeleton /> : <ErrorPanel />}
        </div>
    );
}
