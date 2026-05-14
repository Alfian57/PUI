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

export function DashboardSidebar({
    role = "user",
    onClose
}: DashboardSidebarProps): JSX.Element {
    return (
        <aside className="h-screen overflow-hidden border-b border-brand-steel/10 bg-white lg:border-b-0 lg:border-r">
            <div className="flex h-full min-h-0 flex-col">
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

                <nav className="shrink-0 space-y-1 px-3" aria-label="Menu dashboard">
                    {role === "admin" ? (
                        <>
                            <SidebarLink to="/app/analytics/overview" icon={<BarChart3 className="h-4 w-4" aria-hidden="true" />} onClick={onClose}>
                                Ikhtisar
                            </SidebarLink>
                            <SidebarLink to="/app/analytics/storage" icon={<Database className="h-4 w-4" aria-hidden="true" />} onClick={onClose}>
                                Penyimpanan
                            </SidebarLink>
                            <SidebarLink to="/app/analytics/activity" icon={<Activity className="h-4 w-4" aria-hidden="true" />} onClick={onClose}>
                                Aktivitas
                            </SidebarLink>
                            <SidebarLink to="/app/analytics/system" icon={<Server className="h-4 w-4" aria-hidden="true" />} onClick={onClose}>
                                Kesehatan Sistem
                            </SidebarLink>
                            <SidebarLink to="/app/analytics/reports" icon={<FileArchive className="h-4 w-4" aria-hidden="true" />} onClick={onClose}>
                                Laporan
                            </SidebarLink>
                        </>
                    ) : (
                        <>
                            <SidebarLink to="/app/files" icon={<HardDrive className="h-4 w-4" aria-hidden="true" />} onClick={onClose}>
                                Berkas Saya
                            </SidebarLink>
                            <SidebarLink to="/app/starred" icon={<Star className="h-4 w-4" aria-hidden="true" />} onClick={onClose}>
                                Berbintang
                            </SidebarLink>
                            <SidebarLink to="/app/trash" icon={<Trash2 className="h-4 w-4" aria-hidden="true" />} onClick={onClose}>
                                Sampah
                            </SidebarLink>
                            <SidebarLink to="/app/activity" icon={<Clock3 className="h-4 w-4" aria-hidden="true" />} onClick={onClose}>
                                Riwayat
                            </SidebarLink>
                            <SidebarLink to="/app/insights" icon={<LineChart className="h-4 w-4" aria-hidden="true" />} onClick={onClose}>
                                Insight
                            </SidebarLink>
                        </>
                    )}
                </nav>
            </div>
        </aside>
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
                "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-brand-amber/70",
                isActive
                    ? "bg-brand-sky text-brand-ink"
                    : "text-brand-steel hover:bg-brand-sky/70 hover:text-brand-ink"
            )}
        >
            {icon}
            {children}
        </NavLink>
    );
}
