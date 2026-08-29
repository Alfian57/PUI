import { useAdminSystemStatus } from "@/pages/dashboard/admin/_hooks/useAdminSystemStatus";
import { AdminAnalyticsSkeleton } from "@/pages/dashboard/admin/_components/AdminAnalyticsSkeleton";
import { AdminPageHeader } from "@/pages/dashboard/admin/_components/AdminPageHeader";
import { AdminSystemContent } from "@/pages/dashboard/admin/_components/AdminSystemContent";
import { ErrorPanel } from "@/pages/dashboard/admin/_components/ErrorPanel";

export function AdminSystemPage(): JSX.Element {
    const { systemQuery, system } = useAdminSystemStatus();

    return (
        <div className="space-y-6">
            <AdminPageHeader title="Kesehatan Sistem" description="Status layanan utama HashBox tanpa membuka data pribadi pengguna." />
            {system ? <AdminSystemContent system={system} /> : systemQuery.isLoading ? <AdminAnalyticsSkeleton /> : <ErrorPanel />}
        </div>
    );
}
