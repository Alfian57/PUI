import type { AdminAnalyticsRange } from "@/pages/dashboard/admin/_api/adminApi";

export const RANGE_OPTIONS: Array<{ value: AdminAnalyticsRange; label: string }> = [
    { value: "7d", label: "7 hari" },
    { value: "30d", label: "30 hari" },
    { value: "90d", label: "90 hari" }
];

export const CHART = {
    ink: "#042351",
    amber: "#F79C05",
    success: "#16856E",
    coral: "#D94A35",
    steel: "#24486B",
    blueprint: "#476C9B",
    line: "#D7E4F2"
} as const;

export const CHART_COLORS = [CHART.ink, CHART.amber, CHART.success, CHART.coral, CHART.steel, CHART.blueprint];

export function shortDate(value: string): string {
    return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

export function rangeLabel(range: string): string {
    if (range === "7d") return "7 hari";
    if (range === "90d") return "90 hari";
    return "30 hari";
}

export function statusLabel(status: string): string {
    if (status === "ok") return "Normal";
    if (status === "degraded") return "Terganggu";
    return "Perlu dicek";
}

export function statusTone(status: string): string {
    if (status === "ok") return "text-emerald-700";
    if (status === "degraded") return "text-amber-700";
    return "text-red-700";
}
