import { X } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { adminMenuGroups, userMenuGroups } from "./_lib/sidebarMenu";
import { SidebarGroup } from "./_components/SidebarGroup";
import { SidebarLink } from "./_components/SidebarLink";

type DashboardSidebarProps = {
    role?: "user" | "admin";
    onClose?: () => void;
};

export function DashboardSidebar({ role = "user", onClose }: DashboardSidebarProps): JSX.Element {
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
