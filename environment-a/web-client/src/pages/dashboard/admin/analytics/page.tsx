import { useAdminAnalytics } from "@/pages/dashboard/admin/_hooks/useAdminAnalytics";
import { AdminAnalyticsContent } from "@/pages/dashboard/admin/_components/AdminAnalyticsContent";
import { AdminAnalyticsSkeleton } from "@/pages/dashboard/admin/_components/AdminAnalyticsSkeleton";
import { AdminPageHeader } from "@/pages/dashboard/admin/_components/AdminPageHeader";
import { ErrorPanel } from "@/pages/dashboard/admin/_components/ErrorPanel";

export function AdminAnalyticsPage(): JSX.Element {
    const { range, setRange, analyticsQuery, analytics } = useAdminAnalytics();

    return (
        <div className="space-y-6">
            <AdminPageHeader
                title="Analitik HashBox"
                description="Ringkasan penggunaan aplikasi secara agregat tanpa membuka identitas pengguna, nama berkas, atau struktur direktori pribadi."
                range={range}
                onRangeChange={setRange}
                dataTour="admin-analytics-header"
            />
            {analyticsQuery.isLoading ? <AdminAnalyticsSkeleton /> : null}
            {analyticsQuery.isError ? <ErrorPanel message="Analitik belum dapat dimuat. Coba ulang beberapa saat lagi." /> : null}
            {analytics ? <AdminAnalyticsContent analytics={analytics} /> : null}
        </div>
    );
}
