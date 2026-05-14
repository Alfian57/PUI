import type { ReactNode } from "react";
import clsx from "clsx";

type DashboardShellProps = {
    sidebar: ReactNode;
    topbar: ReactNode;
    sidebarOpen: boolean;
    onSidebarClose: () => void;
    children: ReactNode;
};

export function DashboardShell({
    sidebar,
    topbar,
    sidebarOpen,
    onSidebarClose,
    children
}: DashboardShellProps): JSX.Element {
    return (
        <main className="min-h-screen bg-brand-sky text-brand-ink">
            <div className="relative grid min-h-screen lg:grid-cols-[18.5rem_minmax(0,1fr)]">
                <button
                    type="button"
                    aria-label="Tutup menu"
                    onClick={onSidebarClose}
                    className={clsx(
                        "fixed inset-0 z-30 bg-brand-ink/35 transition-opacity lg:hidden",
                        sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
                    )}
                />
                <div
                    className={clsx(
                        "fixed inset-y-0 left-0 z-40 h-screen w-[min(20rem,calc(100vw-2rem))] transform transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:w-auto lg:translate-x-0",
                        sidebarOpen ? "translate-x-0" : "-translate-x-full"
                    )}
                >
                    {sidebar}
                </div>
                <div className="min-w-0 bg-brand-sky">
                    {topbar}
                    <div className="mx-auto w-full max-w-[1480px] p-4 sm:p-6 xl:p-8">{children}</div>
                </div>
            </div>
        </main>
    );
}
