import clsx from "clsx";
import { NavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

type SidebarLinkProps = {
    to: string;
    icon: LucideIcon;
    tourId?: string;
    onClick?: () => void;
    children: string;
};

export function SidebarLink({ to, icon: Icon, tourId, onClick, children }: SidebarLinkProps): JSX.Element {
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
            <Icon className="h-4 w-4" aria-hidden="true" />
            {children}
        </NavLink>
    );
}
