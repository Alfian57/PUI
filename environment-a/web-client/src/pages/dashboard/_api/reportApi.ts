import { http } from "@/shared/api/http";
import type { AdminAnalyticsRange } from "@/pages/dashboard/admin/_api/adminApi";
import type { InsightRange } from "@/pages/dashboard/insights/_api/insightApi";

export type ReportFormat = "pdf" | "csv";

export async function downloadUserInsightReport(format: ReportFormat, range: InsightRange): Promise<void> {
  await downloadReport(`/api/v1/reports/insight?format=${format}&range=${range}`, `hashbox-insight-${range}.${format}`);
}

export async function downloadAdminAnalyticsReport(format: ReportFormat, range: AdminAnalyticsRange): Promise<void> {
  await downloadReport(`/api/v1/admin/reports/analytics?format=${format}&range=${range}`, `hashbox-analitik-${range}.${format}`);
}

async function downloadReport(url: string, fallbackName: string): Promise<void> {
  const response = await http.get<Blob>(url, { responseType: "blob" });
  const fileName = resolveFileName(response.headers["content-disposition"], fallbackName);
  const blobURL = URL.createObjectURL(response.data);
  const anchor = document.createElement("a");
  anchor.href = blobURL;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(blobURL);
}

function resolveFileName(contentDisposition: unknown, fallbackName: string): string {
  if (typeof contentDisposition !== "string") return fallbackName;
  const match = contentDisposition.match(/filename="?([^"]+)"?/i);
  return match?.[1] ?? fallbackName;
}
