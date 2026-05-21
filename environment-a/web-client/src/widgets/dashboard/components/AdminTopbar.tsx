import { useState } from "react";
import { LogOut, Menu, UserCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { UserAvatar } from "@/shared/ui/UserAvatar";
import type { AuthUser } from "@/shared/types/domain";

type AdminTopbarProps = {
    user: AuthUser;
    onMenuClick: () => void;
    onLogout: () => void;
};

export function AdminTopbar({ user, onMenuClick, onLogout }: AdminTopbarProps): JSX.Element {
    const [accountOpen, setAccountOpen] = useState(false);

    return (
        <header className="relative z-20 rounded-[1.75rem] bg-white/92 p-3 shadow-soft ring-1 ring-brand-line/70 backdrop-blur sm:p-4" data-tour="dashboard-admin-topbar">
            <div className="flex items-center justify-between gap-3">
                <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-brand-steel hover:bg-brand-sky hover:text-brand-logoBlue lg:hidden"
                    aria-label="Menu"
                    onClick={onMenuClick}
                >
                    <Menu className="h-5 w-5" aria-hidden="true" />
                </button>

                <div className="min-w-0" data-tour="dashboard-admin-heading">
                    <p className="truncate text-sm font-semibold text-brand-ink">Dashboard Admin</p>
                    <p className="truncate text-xs text-brand-steel">Analitik agregat HashBox</p>
                </div>

                <div
                    className="relative shrink-0"
                    onBlur={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                            setAccountOpen(false);
                        }
                    }}
                >
                    <button
                        type="button"
                        onClick={() => setAccountOpen((current) => !current)}
                        className="flex h-10 w-10 items-center justify-center rounded-full outline-none ring-brand-logoYellow transition hover:ring-2 focus:ring-2"
                        aria-label="Menu akun"
                        aria-expanded={accountOpen}
                        data-tour="dashboard-account"
                    >
                        <UserAvatar name={user.full_name} size="sm" />
                    </button>

                    {accountOpen ? (
                        <div className="absolute right-0 top-12 z-40 w-64 overflow-hidden rounded-3xl border border-brand-steel/10 bg-white p-2 shadow-deck">
                            <div className="px-3 py-3">
                                <p className="truncate text-sm font-semibold text-brand-ink">{user.full_name}</p>
                                <p className="truncate text-xs text-brand-steel">{user.email}</p>
                            </div>
                            <div className="h-px bg-brand-steel/10" />
                            <Link
                                to="/app/profile"
                                onClick={() => setAccountOpen(false)}
                                className="mt-2 flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-brand-steel transition hover:bg-brand-sky hover:text-brand-logoBlue focus:outline-none focus:ring-2 focus:ring-brand-logoYellow/70"
                            >
                                <UserCircle className="h-4 w-4" aria-hidden="true" />
                                Profil
                            </Link>
                            <button
                                type="button"
                                onClick={() => {
                                    setAccountOpen(false);
                                    onLogout();
                                }}
                                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold text-brand-coral transition hover:bg-brand-coral/10 focus:outline-none focus:ring-2 focus:ring-brand-logoYellow/70"
                            >
                                <LogOut className="h-4 w-4" aria-hidden="true" />
                                Keluar
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>
        </header>
    );
}
