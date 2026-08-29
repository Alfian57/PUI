import { CheckCircle2, Info, ShieldCheck, ShieldX } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SecurityStatus } from "@/pages/dashboard/security-lab/_types/securityLab";

export const STATUS_META: Record<SecurityStatus, { label: string; badge: string; icon: LucideIcon }> = {
    info: {
        label: "INFO",
        badge: "bg-brand-sky text-brand-steel",
        icon: Info
    },
    ok: {
        label: "OK",
        badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
        icon: CheckCircle2
    },
    blocked: {
        label: "DITOLAK VAULT CORE",
        badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-300",
        icon: ShieldCheck
    },
    breach: {
        label: "PELANGGARAN",
        badge: "bg-red-50 text-red-700 ring-1 ring-red-300",
        icon: ShieldX
    }
};

export function formatSecurityValue(value: unknown): string {
    if (value === null || value === undefined) {
        return "-";
    }
    if (Array.isArray(value)) {
        return value.map((item) => formatSecurityValue(item)).join(", ");
    }
    if (typeof value === "object") {
        return JSON.stringify(value);
    }
    return String(value);
}
