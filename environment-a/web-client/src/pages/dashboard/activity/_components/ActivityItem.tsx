import clsx from "clsx";
import { formatDate } from "@/shared/lib/format";
import type { ActivityLog } from "@/pages/dashboard/activity/_types/activity";
import {
    ACTION_DESCRIPTIONS,
    ACTION_LABELS,
    ACTION_META,
    DEFAULT_ACTIVITY_META
} from "@/pages/dashboard/activity/_lib/activityMeta";

type ActivityItemProps = {
    log: ActivityLog;
};

export function ActivityItem({ log }: ActivityItemProps): JSX.Element {
    const meta = ACTION_META[log.action] ?? {
        ...DEFAULT_ACTIVITY_META,
        badge: log.resource_type || DEFAULT_ACTIVITY_META.badge
    };
    const ActivityIcon = meta.icon;

    return (
        <article className="group rounded-2xl border border-brand-steel/10 bg-brand-sky/55 px-4 py-3 transition duration-200 hover:-translate-y-0.5 hover:border-brand-amber/35 hover:bg-white hover:shadow-soft">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                    <div className={clsx("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition group-hover:scale-105", meta.tone)}>
                        <ActivityIcon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-semibold text-brand-ink">{ACTION_LABELS[log.action] ?? log.action}</h4>
                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-steel ring-1 ring-brand-steel/10">
                                {meta.badge}
                            </span>
                        </div>
                        <p className="mt-1 text-sm leading-5 text-brand-steel">
                            {ACTION_DESCRIPTIONS[log.action] ?? "Aktivitas akun tercatat."}
                        </p>
                    </div>
                </div>

                <time className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-brand-steel ring-1 ring-brand-steel/10 sm:text-right">
                    {formatDate(log.created_at)}
                </time>
            </div>
        </article>
    );
}
