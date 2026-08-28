import clsx from "clsx";
import { NavLink } from "react-router-dom";
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
    Trash2,
    X
} from "lucide-react";
import { IconButton } from "@/shared/ui/IconButton";
import { env } from "@/shared/config/env";

type DashboardSidebarProps = {
    role?: "user" | "admin";
    onClose?: () => void;
};

const userMenuGroups = [
    {
        label: "Ruang Kerja",
        items: [
            {
                to: "/app/files",
                label: "Berkas Saya",
                icon: <HardDrive className="h-4 w-4" aria-hidden="true" />,
                tourId: "sidebar-files"
            },
            {
                to: "/app/starred",
                label: "Berbintang",
                icon: <Star className="h-4 w-4" aria-hidden="true" />,
                tourId: "sidebar-starred"
            }
        ]
    },
    {
        label: "Manajemen",
        items: [
            {
                to: "/app/trash",
                label: "Sampah",
                icon: <Trash2 className="h-4 w-4" aria-hidden="true" />,
                tourId: "sidebar-trash"
            }
        ]
    },
    {
        label: "Pemantauan",
        items: [
            {
                to: "/app/activity",
                label: "Riwayat",
                icon: <Clock3 className="h-4 w-4" aria-hidden="true" />,
                tourId: "sidebar-activity"
            },
            {
                to: "/app/insights",
                label: "Insight",
                icon: <LineChart className="h-4 w-4" aria-hidden="true" />,
                tourId: "sidebar-insights"
            }
        ]
    },
    // Security Lab is only surfaced when the demo flag is enabled (skripsi env).
    ...(env.securityLabEnabled
        ? [
              {
                  label: "Keamanan",
                  items: [
                      {
                          to: "/app/security-lab",
                          label: "Security Lab",
                          icon: <ShieldCheck className="h-4 w-4" aria-hidden="true" />,
                          tourId: "sidebar-security-lab"
                      }
                  ]
              }
          ]
        : [])
];

const adminMenuGroups = [
    {
        label: "Analitik",
        items: [
            {
                to: "/app/analytics/overview",
                label: "Ikhtisar",
                icon: <BarChart3 className="h-4 w-4" aria-hidden="true" />,
                tourId: "sidebar-admin-overview"
            },
            {
                to: "/app/analytics/storage",
                label: "Penyimpanan",
                icon: <Database className="h-4 w-4" aria-hidden="true" />,
                tourId: "sidebar-admin-storage"
            },
            {
                to: "/app/analytics/activity",
                label: "Aktivitas",
                icon: <Activity className="h-4 w-4" aria-hidden="true" />,
                tourId: "sidebar-admin-activity"
            }
        ]
    },
    {
        label: "Operasional",
        items: [
            {
                to: "/app/analytics/system",
                label: "Kesehatan Sistem",
                icon: <Server className="h-4 w-4" aria-hidden="true" />,
                tourId: "sidebar-admin-system"
            },
            {
                to: "/app/analytics/security",
                label: "Monitoring Keamanan",
                icon: <ShieldAlert className="h-4 w-4" aria-hidden="true" />,
                tourId: "sidebar-admin-security"
            },
            {
                to: "/app/analytics/reports",
                label: "Laporan",
                icon: <FileArchive className="h-4 w-4" aria-hidden="true" />,
                tourId: "sidebar-admin-reports"
            }
        ]
    }
];

export function DashboardSidebar({
    role = "user",
    onClose
}: DashboardSidebarProps): JSX.Element {
    const menuGroups = role === "admin" ? adminMenuGroups : userMenuGroups;

    return (
        <aside className="h-full overflow-hidden bg-brand-logoBlue text-white shadow-deck lg:rounded-[1.75rem] xl:rounded-[2rem]" data-tour="dashboard-sidebar">
            <div className="flex h-full min-h-0 flex-col">
                <div className="shrink-0 px-4 pb-5 pt-5">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-soft">
                                <img src="/hashbox-logo.png" alt="HashBox" className="h-full w-full object-cover" />
                            </div>
                            <div>
                                <p className="font-display text-xl font-semibold text-white">HashBox</p>
                                <p className="text-xs font-medium text-white/58">{role === "admin" ? "Analitik aplikasi" : "Berkas pribadi"}</p>
                            </div>
                        </div>
                        {onClose ? (
                            <IconButton
                                label="Tutup menu"
                                className="bg-white/10 text-white hover:bg-white/15 lg:hidden"
                                icon={<X className="h-4 w-4" aria-hidden="true" />}
                                onClick={onClose}
                            />
                        ) : null}
                    </div>
                </div>

                <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-3 pb-5" aria-label="Menu dashboard" data-tour="dashboard-nav">
                    {menuGroups.map((group) => (
                        <SidebarGroup key={group.label} label={group.label}>
                            {group.items.map((item) => (
                                <SidebarLink
                                    key={item.to}
                                    to={item.to}
                                    icon={item.icon}
                                    tourId={item.tourId}
                                    onClick={onClose}
                                >
                                    {item.label}
                                </SidebarLink>
                            ))}
                        </SidebarGroup>
                    ))}
                </nav>
            </div>
        </aside>
    );
}

type SidebarGroupProps = {
    label: string;
    children: JSX.Element[];
};

function SidebarGroup({ label, children }: SidebarGroupProps): JSX.Element {
    return (
        <section aria-label={label}>
            <p className="px-4 pb-2 font-display text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-brand-logoYellow/80">
                {label}
            </p>
            <div className="space-y-1">{children}</div>
        </section>
    );
}

type SidebarLinkProps = {
    to: string;
    icon: JSX.Element;
    tourId?: string;
    onClick?: () => void;
    children: string;
};

function SidebarLink({ to, icon, tourId, onClick, children }: SidebarLinkProps): JSX.Element {
    return (
        <NavLink
            to={to}
            onClick={onClick}
            data-tour={tourId}
            className={({ isActive }) => clsx(
                "relative flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-brand-logoYellow/80",
                isActive
                    ? "bg-white/14 text-white shadow-soft before:absolute before:left-2 before:h-6 before:w-1 before:rounded-full before:bg-brand-logoYellow"
                    : "text-white/68 hover:bg-white/10 hover:text-white"
            )}
        >
            {icon}
            {children}
        </NavLink>
    );
}
