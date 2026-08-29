import type { LucideIcon } from "lucide-react";
import {
    Activity,
    BarChart3,
    Clock3,
    Database,
    FileArchive,
    HardDrive,
    LineChart,
    Server,
    ShieldAlert,
    ShieldCheck,
    Star,
    Trash2
} from "lucide-react";
import { env } from "@/shared/config/env";
import { ROUTES } from "@/app/routes";

export type SidebarMenuItem = {
    to: string;
    label: string;
    icon: LucideIcon;
    tourId: string;
};

export type SidebarMenuGroup = {
    label: string;
    items: SidebarMenuItem[];
};

export const userMenuGroups: SidebarMenuGroup[] = [
    {
        label: "Ruang Kerja",
        items: [
            { to: ROUTES.app.files, label: "Berkas Saya", icon: HardDrive, tourId: "sidebar-files" },
            { to: ROUTES.app.starred, label: "Berbintang", icon: Star, tourId: "sidebar-starred" }
        ]
    },
    {
        label: "Manajemen",
        items: [{ to: ROUTES.app.trash, label: "Sampah", icon: Trash2, tourId: "sidebar-trash" }]
    },
    {
        label: "Pemantauan",
        items: [
            { to: ROUTES.app.activity, label: "Riwayat", icon: Clock3, tourId: "sidebar-activity" },
            { to: ROUTES.app.insights, label: "Insight", icon: LineChart, tourId: "sidebar-insights" }
        ]
    },
    ...(env.securityLabEnabled
        ? [{
              label: "Keamanan",
              items: [{ to: ROUTES.app.securityLab, label: "Security Lab", icon: ShieldCheck, tourId: "sidebar-security-lab" }]
          }]
        : [])
];

export const adminMenuGroups: SidebarMenuGroup[] = [
    {
        label: "Analitik",
        items: [
            { to: ROUTES.app.analytics.overview, label: "Ikhtisar", icon: BarChart3, tourId: "sidebar-admin-overview" },
            { to: ROUTES.app.analytics.storage, label: "Penyimpanan", icon: Database, tourId: "sidebar-admin-storage" },
            { to: ROUTES.app.analytics.activity, label: "Aktivitas", icon: Activity, tourId: "sidebar-admin-activity" }
        ]
    },
    {
        label: "Operasional",
        items: [
            { to: ROUTES.app.analytics.system, label: "Kesehatan Sistem", icon: Server, tourId: "sidebar-admin-system" },
            { to: ROUTES.app.analytics.security, label: "Monitoring Keamanan", icon: ShieldAlert, tourId: "sidebar-admin-security" },
            { to: ROUTES.app.analytics.reports, label: "Laporan", icon: FileArchive, tourId: "sidebar-admin-reports" }
        ]
    }
];
