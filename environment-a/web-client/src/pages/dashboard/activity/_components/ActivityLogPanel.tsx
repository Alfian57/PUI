import { useCallback, useEffect } from "react";
import { Clock3 } from "lucide-react";
import { ACTIVITY_PAGE_SIZE } from "@/pages/dashboard/activity/_api/activityApi";
import { ActivityItem } from "@/pages/dashboard/activity/_components/ActivityItem";
import { useActivityLogs } from "@/pages/dashboard/activity/_hooks/useActivityLogs";
import { useInfiniteScroll } from "@/shared/hooks/useInfiniteScroll";
import { usePagination } from "@/shared/hooks/usePagination";

export function ActivityLogPanel(): JSX.Element {
    const pagination = usePagination({ queryParam: "activity[page]", pageSize: ACTIVITY_PAGE_SIZE });
    const activity = useActivityLogs();
    const loadMore = useCallback(async () => {
        if (!activity.hasMore || activity.isFetchingNextPage) {
            return;
        }

        const result = await activity.loadNextPage();
        const loadedPages = result.data?.pages.length ?? 0;

        if (loadedPages > 0) {
            pagination.setPage(loadedPages - 1);
        }
    }, [activity.hasMore, activity.isFetchingNextPage, activity.loadNextPage, pagination.setPage]);
    const loadMoreRef = useInfiniteScroll({
        hasMore: activity.hasMore,
        isLoading: activity.isLoading || activity.isFetchingNextPage,
        onLoadMore: loadMore
    });

    useEffect(() => {
        if (
            pagination.page <= activity.loadedPage ||
            !activity.hasMore ||
            activity.isFetchingNextPage ||
            activity.isError
        ) {
            return;
        }

        void activity.loadNextPage();
    }, [activity.hasMore, activity.isError, activity.isFetchingNextPage, activity.loadNextPage, activity.loadedPage, pagination.page]);

    return (
        <section className="rounded-[1.75rem] border border-brand-steel/10 bg-white p-5 shadow-soft">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="font-display text-[11px] uppercase tracking-[0.24em] text-brand-steel">Riwayat</p>
                    <h3 className="mt-1 font-display text-xl font-semibold text-brand-ink">Riwayat Aktivitas</h3>
                </div>
                <p className="text-xs font-medium text-brand-steel">{activity.total} aktivitas tersimpan</p>
            </div>

            {activity.isLoading ? (
                <div className="mt-5 space-y-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="h-20 animate-pulse rounded-2xl bg-gradient-to-r from-white via-brand-sky/70 to-white bg-[length:200%_100%]" />
                    ))}
                </div>
            ) : null}

            {activity.isError ? (
                <div className="mt-5 rounded-2xl border border-brand-coral/20 bg-brand-coral/10 px-5 py-8 text-center" role="alert">
                    <p className="font-display text-lg font-semibold text-brand-coral">Riwayat aktivitas belum dapat dimuat</p>
                    <p className="mt-1 text-sm text-brand-coral/80">Periksa koneksi lalu coba buka halaman ini kembali.</p>
                </div>
            ) : null}

            {!activity.isLoading && !activity.isError && activity.logs.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-dashed border-brand-steel/20 bg-brand-sky/55 px-5 py-8 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-sky text-brand-steel">
                        <Clock3 className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <p className="mt-3 font-display text-lg font-semibold text-brand-ink">Belum ada aktivitas</p>
                    <p className="mt-1 text-sm text-brand-steel">Aktivitas akun akan muncul di sini.</p>
                </div>
            ) : null}

            {!activity.isError && activity.logs.length > 0 ? (
                <div className="mt-5 space-y-3">
                    {activity.logs.map((log) => <ActivityItem key={log.id} log={log} />)}
                </div>
            ) : null}

            {!activity.isError && activity.logs.length > 0 && activity.hasMore ? (
                <div className="mt-5 flex flex-col items-center gap-3">
                    <div ref={loadMoreRef} className="h-1 w-full" aria-hidden="true" />
                    <button
                        type="button"
                        disabled={activity.isFetchingNextPage}
                        onClick={() => void loadMore()}
                        className="rounded-2xl border border-brand-steel/20 px-4 py-2 text-sm font-semibold text-brand-steel transition hover:bg-brand-sky disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {activity.isFetchingNextPage ? "Memuat..." : "Muat lebih banyak"}
                    </button>
                </div>
            ) : null}

            {!activity.isError && activity.logs.length > 0 && !activity.hasMore ? (
                <p className="mt-5 text-center text-xs font-medium text-brand-steel">Semua aktivitas sudah dimuat.</p>
            ) : null}
        </section>
    );
}
