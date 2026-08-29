import { FileArchive, FileText } from "lucide-react";
import { useAdminAnalyticsRange } from "@/pages/dashboard/admin/_hooks/useAdminAnalytics";
import { useAdminReportDownload } from "@/pages/dashboard/admin/_hooks/useAdminReportDownload";
import { AdminPageHeader } from "@/pages/dashboard/admin/_components/AdminPageHeader";
import { ReportDownloadCard } from "@/pages/dashboard/admin/_components/ReportDownloadCard";

export function AdminReportsPage(): JSX.Element {
    const [range, setRange] = useAdminAnalyticsRange();
    const { downloading, handleDownload } = useAdminReportDownload(range);

    return (
        <div className="space-y-6">
            <AdminPageHeader title="Laporan" description="Unduh laporan analitik agregat untuk dokumentasi tanpa data pribadi pengguna." range={range} onRangeChange={setRange} />
            <section className="grid gap-4 md:grid-cols-2">
                <ReportDownloadCard
                    icon={<FileArchive className="h-8 w-8 text-brand-steel" aria-hidden="true" />}
                    title="Laporan PDF"
                    description="Ringkasan siap baca untuk lampiran, demo, atau dokumentasi evaluasi."
                    buttonLabel={downloading === "pdf" ? "Membuat..." : "Unduh PDF"}
                    onDownload={() => void handleDownload("pdf")}
                    disabled={Boolean(downloading)}
                />
                <ReportDownloadCard
                    icon={<FileText className="h-8 w-8 text-brand-steel" aria-hidden="true" />}
                    title="Laporan CSV"
                    description="Data tabular untuk pengecekan ulang dan pengolahan sederhana."
                    buttonLabel={downloading === "csv" ? "Membuat..." : "Unduh CSV"}
                    variant="secondary"
                    onDownload={() => void handleDownload("csv")}
                    disabled={Boolean(downloading)}
                />
            </section>
        </div>
    );
}
