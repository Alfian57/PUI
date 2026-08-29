import type { DirectoryRecord } from "@/shared/types/directories";
import type { FileRecord } from "@/shared/types/files";
import type { WorkspaceCustomTimeRange, WorkspaceTimeFilter } from "@/widgets/dashboard/components/_types/driveToolbar";

export type ResolvedTimeRange = {
    from: Date;
    to: Date;
};

export function filterByTime<TItem extends DirectoryRecord | FileRecord>(
    items: TItem[],
    filter: WorkspaceTimeFilter,
    customRange: WorkspaceCustomTimeRange
): TItem[] {
    const range = resolveTimeRange(filter, customRange);
    if (!range) {
        return items;
    }

    return items.filter((item) => {
        const createdAt = new Date(item.created_at).getTime();
        return createdAt >= range.from.getTime() && createdAt <= range.to.getTime();
    });
}

export function resolveTimeRange(
    filter: WorkspaceTimeFilter,
    customRange: WorkspaceCustomTimeRange
): ResolvedTimeRange | null {
    if (filter === "all") {
        return null;
    }

    const now = new Date();
    const to = endOfDay(now);
    if (filter === "today") {
        return { from: startOfDay(now), to };
    }
    if (filter === "7d") {
        return { from: startOfDay(daysAgo(6)), to };
    }
    if (filter === "30d") {
        return { from: startOfDay(daysAgo(29)), to };
    }
    if (filter === "month") {
        return { from: new Date(now.getFullYear(), now.getMonth(), 1), to };
    }
    if (filter === "year") {
        return { from: new Date(now.getFullYear(), 0, 1), to };
    }

    const from = customRange.from ? startOfDay(new Date(customRange.from)) : null;
    const customTo = customRange.to ? endOfDay(new Date(customRange.to)) : null;
    if (!from && !customTo) {
        return null;
    }

    return {
        from: from ?? new Date(0),
        to: customTo ?? to
    };
}

function daysAgo(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
}

function startOfDay(date: Date): Date {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    return next;
}

function endOfDay(date: Date): Date {
    const next = new Date(date);
    next.setHours(23, 59, 59, 999);
    return next;
}

export function timeFilterLabel(filter: WorkspaceTimeFilter): string {
    if (filter === "today") {
        return "hari ini";
    }
    if (filter === "7d") {
        return "7 hari";
    }
    if (filter === "30d") {
        return "30 hari";
    }
    if (filter === "month") {
        return "bulan ini";
    }
    if (filter === "year") {
        return "tahun ini";
    }
    if (filter === "custom") {
        return "kustom";
    }
    return "semua waktu";
}
