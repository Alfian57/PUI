import type { InsightRange } from "@/pages/dashboard/insights/_api/insightApi";

export const RANGE_OPTIONS: Array<{ value: InsightRange; label: string }> = [
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
    line: "#D7E4F2"
} as const;

export function rangeLabel(range: string): string {
    if (range === "7d") {
        return "7 hari";
    }
    if (range === "90d") {
        return "90 hari";
    }
    return "30 hari";
}

export function shortDate(value: string): string {
    return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}
