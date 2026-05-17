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
    Star,
    Trash2,
    X
} from "lucide-react";
import { IconButton } from "@/shared/ui/IconButton";

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
                icon: <HardDrive className="h-4 w-4" aria-hidden="true" />
            },
            {
                to: "/app/starred",
                label: "Berbintang",
                icon: <Star className="h-4 w-4" aria-hidden="true" />
            }
        ]
    },
    {
        label: "Manajemen",
        items: [
            {
                to: "/app/trash",
                label: "Sampah",
                icon: <Trash2 className="h-4 w-4" aria-hidden="true" />
            }
        ]
    },
    {
        label: "Pemantauan",
        items: [
            {
                to: "/app/activity",
                label: "Riwayat",
                icon: <Clock3 className="h-4 w-4" aria-hidden="true" />
            },
            {
                to: "/app/insights",
                label: "Insight",
                icon: <LineChart className="h-4 w-4" aria-hidden="true" />
            }
        ]
    }
];

const adminMenuGroups = [
    {
        label: "Analitik",
        items: [
            {
                to: "/app/analytics/overview",
                label: "Ikhtisar",
                icon: <BarChart3 className="h-4 w-4" aria-hidden="true" />
            },
            {
                to: "/app/analytics/storage",
                label: "Penyimpanan",
                icon: <Database className="h-4 w-4" aria-hidden="true" />
            },
            {
                to: "/app/analytics/activity",
                label: "Aktivitas",
                icon: <Activity className="h-4 w-4" aria-hidden="true" />
            }
        ]
    },
    {
        label: "Operasional",
        items: [
            {
                to: "/app/analytics/system",
                label: "Kesehatan Sistem",
                icon: <Server className="h-4 w-4" aria-hidden="true" />
            },
            {
                to: "/app/analytics/reports",
                label: "Laporan",
                icon: <FileArchive className="h-4 w-4" aria-hidden="true" />
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
        <aside className="h-screen overflow-hidden border-b border-brand-steel/10 bg-white lg:border-b-0 lg:border-r">
            <div className="flex h-full min-h-0 flex-col">
                <div className="h-1 shrink-0 bg-brand-amber" />
                <div className="shrink-0 px-4 pb-4 pt-5">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-soft">
                                <img src="/hashbox-logo.png" alt="HashBox" className="h-full w-full object-cover" />
                            </div>
                            <div>
                                <p className="font-display text-xl font-semibold text-brand-ink">HashBox</p>
                                <p className="text-xs text-brand-steel">{role === "admin" ? "Analitik aplikasi" : "Berkas pribadi"}</p>
                            </div>
                        </div>
                        {onClose ? (
                            <IconButton
                                label="Tutup menu"
                                className="lg:hidden"
                                icon={<X className="h-4 w-4" aria-hidden="true" />}
                                onClick={onClose}
                            />
                        ) : null}
                    </div>
                </div>

                <nav className="shrink-0 space-y-5 px-3" aria-label="Menu dashboard">
                    {menuGroups.map((group) => (
                        <SidebarGroup key={group.label} label={group.label}>
                            {group.items.map((item) => (
                                <SidebarLink
                                    key={item.to}
                                    to={item.to}
                                    icon={item.icon}
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
            <p className="px-4 pb-2 font-display text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-brand-steel/60">
                {label}
            </p>
            <div className="space-y-1">{children}</div>
        </section>
    );
}

type SidebarLinkProps = {
    to: string;
    icon: JSX.Element;
    onClick?: () => void;
    children: string;
};

function SidebarLink({ to, icon, onClick, children }: SidebarLinkProps): JSX.Element {
    return (
        <NavLink
            to={to}
            onClick={onClick}
            className={({ isActive }) => clsx(
                "relative flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-brand-amber/70",
                isActive
                    ? "bg-brand-ink text-white shadow-soft before:absolute before:left-2 before:h-6 before:w-1 before:rounded-full before:bg-brand-amber"
                    : "text-brand-steel hover:bg-brand-sky/70 hover:text-brand-ink"
            )}
        >
            {icon}
            {children}
        </NavLink>
    );
}
