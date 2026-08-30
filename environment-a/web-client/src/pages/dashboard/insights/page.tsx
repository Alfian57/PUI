import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileArchive } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getUserInsight, type InsightRange } from "@/pages/dashboard/insights/_api/insightApi";
import { downloadUserInsightReport, type ReportFormat } from "@/pages/dashboard/_api/reportApi";
import { useNoticeCenter } from "@/shared/contexts/useNoticeCenter";
import { queryKeys } from "@/shared/lib/queryKeys";
import { InsightContent } from "@/pages/dashboard/insights/_components/InsightContent";
import { InsightSkeleton } from "@/pages/dashboard/insights/_components/InsightSkeleton";
import { RangeTabs } from "@/pages/dashboard/insights/_components/RangeTabs";
import { parseEnumQueryParam, useQueryParamState } from "@/shared/hooks/useQueryParamState";

const INSIGHT_RANGE_OPTIONS = ["7d", "30d", "90d"] as const;

export function InsightPage(): JSX.Element {
    const { value: range, setValue: setRange } = useQueryParamState<InsightRange>({
        key: "insights.range",
        defaultValue: "30d",
        parse: parseEnumQueryParam(INSIGHT_RANGE_OPTIONS, "30d")
    });
    const [downloading, setDownloading] = useState<ReportFormat | null>(null);
    const notice = useNoticeCenter();
    const insightQuery = useQuery({
        queryKey: queryKeys.insights.user(range),
        queryFn: () => getUserInsight(range)
    });

    async function handleDownload(format: ReportFormat): Promise<void> {
        setDownloading(format);
        try {
            await downloadUserInsightReport(format, range);
            notice.show({ variant: "success", message: "Laporan " + format.toUpperCase() + " berhasil dibuat." });
        } catch (cause) {
            notice.show({
                variant: "error",
                message: cause instanceof Error ? cause.message : "Laporan belum bisa dibuat."
            });
        } finally {
            setDownloading(null);
        }
    }

    return (
        <div className="space-y-6">
            <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between" data-tour="insight-header">
                <div>
                    <h1 className="font-display text-3xl font-semibold text-brand-logoBlue">Insight</h1>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-brand-steel">
                        Ringkasan penyimpanan pribadi, efisiensi deduplikasi, dan aktivitas berkas Anda.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <RangeTabs range={range} onChange={setRange} />
                    <Button
                        variant="secondary"
                        icon={<FileArchive className="h-4 w-4" aria-hidden="true" />}
                        disabled={Boolean(downloading)}
                        onClick={() => void handleDownload("pdf")}
                    >
                        PDF
                    </Button>
                    <Button
                        variant="secondary"
                        disabled={Boolean(downloading)}
                        onClick={() => void handleDownload("csv")}
                    >
                        CSV
                    </Button>
                </div>
            </section>

            {insightQuery.isLoading ? <InsightSkeleton /> : null}

            {insightQuery.isError ? (
                <section className="rounded-[1.75rem] border border-brand-coral/20 bg-white p-6 text-brand-coral shadow-soft">
                    Insight belum dapat dimuat. Coba ulang beberapa saat lagi.
                </section>
            ) : null}

            {insightQuery.data ? <InsightContent insight={insightQuery.data} /> : null}
        </div>
    );
}
