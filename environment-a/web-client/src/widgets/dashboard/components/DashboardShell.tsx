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
        <main className="min-h-[100dvh] w-[100dvw] overflow-x-hidden bg-[#eef3f9] text-brand-ink" data-tour="dashboard-shell">
            <div className="relative grid min-h-[100dvh] w-full overflow-hidden bg-[#eef3f9]">
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
                    data-tour="dashboard-sidebar-frame"
                    className={clsx(
                        "fixed inset-y-0 left-0 z-40 h-screen w-[min(20rem,calc(100vw-2rem))] transform transition-transform duration-200 lg:absolute lg:bottom-5 lg:left-5 lg:top-5 lg:z-20 lg:h-[calc(100dvh-2.5rem)] lg:w-[16rem] lg:translate-x-0 xl:bottom-7 xl:left-7 xl:top-7 xl:h-[calc(100dvh-3.5rem)]",
                        sidebarOpen ? "translate-x-0" : "-translate-x-full"
                    )}
                >
                    {sidebar}
                </div>
                <div className="min-w-0 bg-transparent lg:h-[100dvh] lg:overflow-y-auto lg:pl-[18rem] xl:pl-[19rem]" data-tour="dashboard-content">
                    <div className="w-full p-4 sm:p-6 lg:min-h-[100dvh] xl:p-7">
                        <div className="min-w-0 space-y-5">
                            {topbar}
                            <div>{children}</div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
