import { useCallback, useState } from "react";
import { downloadAdminAnalyticsReport, type ReportFormat } from "@/pages/dashboard/_api/reportApi";
import { useNoticeCenter } from "@/shared/contexts/useNoticeCenter";
import type { AdminAnalyticsRange } from "@/pages/dashboard/admin/_api/adminApi";

export function useAdminReportDownload(range: AdminAnalyticsRange) {
    const [downloading, setDownloading] = useState<ReportFormat | null>(null);
    const notice = useNoticeCenter();

    const handleDownload = useCallback(async (format: ReportFormat): Promise<void> => {
        setDownloading(format);
        try {
            await downloadAdminAnalyticsReport(format, range);
            notice.show({ variant: "success", message: `Laporan ${format.toUpperCase()} berhasil dibuat.` });
        } catch (cause) {
            notice.show({ variant: "error", message: cause instanceof Error ? cause.message : "Laporan belum bisa dibuat." });
        } finally {
            setDownloading(null);
        }
    }, [notice, range]);

    return { downloading, handleDownload };
}
