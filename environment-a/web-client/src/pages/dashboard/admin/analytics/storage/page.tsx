import { useAdminAnalytics } from "@/pages/dashboard/admin/_hooks/useAdminAnalytics";
import { AdminAnalyticsSkeleton } from "@/pages/dashboard/admin/_components/AdminAnalyticsSkeleton";
import { AdminPageHeader } from "@/pages/dashboard/admin/_components/AdminPageHeader";
import { AdminStorageContent } from "@/pages/dashboard/admin/_components/AdminStorageContent";
import { ErrorPanel } from "@/pages/dashboard/admin/_components/ErrorPanel";

export function AdminStoragePage(): JSX.Element {
    const { range, setRange, analyticsQuery, analytics } = useAdminAnalytics();

    return (
        <div className="space-y-6">
            <AdminPageHeader title="Penyimpanan" description="Pantau kapasitas aktif, Sampah, chunk deduplikasi, dan komposisi berkas secara agregat." range={range} onRangeChange={setRange} />
            {analytics ? <AdminStorageContent analytics={analytics} /> : analyticsQuery.isLoading ? <AdminAnalyticsSkeleton /> : <ErrorPanel />}
        </div>
    );
}
