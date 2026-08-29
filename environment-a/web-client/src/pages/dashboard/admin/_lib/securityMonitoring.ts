import { AlertTriangle, Clock3, ShieldAlert, ShieldCheck, XCircle, type LucideIcon } from "lucide-react";
import type { SecurityMonitorRange } from "@/pages/dashboard/admin/security-monitoring/_api/securityMonitorApi";
import type { SecurityEvent } from "@/shared/types/security";

export const RANGE_OPTIONS: Array<{ value: SecurityMonitorRange; label: string }> = [
    { value: "24h", label: "24 jam" },
    { value: "7d", label: "7 hari" },
    { value: "30d", label: "30 hari" }
];

export const EVENT_TYPE_OPTIONS = [
    ["", "Semua tipe"],
    ["FAILED_LOGIN", "Login gagal"],
    ["UNAUTHORIZED_REQUEST", "Unauthorized"],
    ["FORBIDDEN_REQUEST", "Forbidden"],
    ["RATE_LIMIT_BLOCKED", "Rate limit"],
    ["VAULT_OPERATION_BLOCKED", "Vault diblokir"],
    ["SECURITY_LAB_EVENT", "Security Lab event"],
    ["SECURITY_LAB_SUMMARY", "Security Lab summary"]
] as const;

export const OUTCOME_OPTIONS = [
    ["", "Semua status"],
    ["detected", "Terdeteksi"],
    ["blocked", "Diblokir"],
    ["breach", "Breach"],
    ["ok", "OK"],
    ["info", "Info"]
] as const;

export const SOURCE_OPTIONS = [
    ["", "Semua sumber"],
    ["api", "API Service"],
    ["vault_core", "Vault Core"],
    ["security_lab", "Security Lab"]
] as const;

export function sortNewest(a: SecurityEvent, b: SecurityEvent): number {
    return new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime();
}

export function sortOldest(a: SecurityEvent, b: SecurityEvent): number {
    return sortNewest(b, a);
}

export function rangeStart(range: SecurityMonitorRange): number {
    return Date.now() - (range === "24h" ? 24 : range === "7d" ? 7 * 24 : 30 * 24) * 60 * 60 * 1000;
}

export function outcomeLabel(outcome: string): string {
    return outcome === "blocked" ? "DIBLOKIR" : outcome === "detected" ? "TERDETEKSI" : outcome === "breach" ? "BREACH" : outcome.toUpperCase();
}

export function outcomeTone(outcome: string): string {
    return outcome === "blocked"
        ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
        : outcome === "detected"
            ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
            : outcome === "breach"
                ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
}

export type SecurityEventMeta = {
    label: string;
    source: string;
    icon: LucideIcon;
    tone: string;
};

export function eventMeta(event: SecurityEvent): SecurityEventMeta {
    if (event.source === "vault_core") {
        return { label: "Vault Core menolak operasi", source: "Vault Core", icon: ShieldCheck, tone: "bg-amber-50 text-amber-700" };
    }
    if (event.source === "security_lab") {
        return { label: "Security Lab", source: "Security Lab", icon: ShieldAlert, tone: "bg-brand-sky text-brand-steel" };
    }
    if (event.event_type === "RATE_LIMIT_BLOCKED") {
        return { label: "Rate limit memblokir request", source: "API Service", icon: AlertTriangle, tone: "bg-red-50 text-red-700" };
    }
    if (event.event_type === "FAILED_LOGIN") {
        return { label: "Login gagal", source: "API Service", icon: XCircle, tone: "bg-red-50 text-red-700" };
    }
    return { label: "Akses API ditolak", source: "API Service", icon: Clock3, tone: "bg-brand-sky text-brand-steel" };
}

export function connectionLabel(connection: string): string {
    return connection === "live" ? "LIVE" : connection === "reconnecting" ? "Menyambungkan ulang" : connection === "connecting" ? "Menyambungkan" : connection === "error" ? "Stream bermasalah" : "Tidak aktif";
}

export function connectionTone(connection: string): string {
    return connection === "live" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : connection === "error" ? "bg-red-50 text-red-700 ring-1 ring-red-200" : "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
}
