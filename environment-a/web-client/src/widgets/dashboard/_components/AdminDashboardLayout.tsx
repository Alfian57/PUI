import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/pages/auth/_hooks/useAuth";
import { useNoticeCenter } from "@/shared/contexts/useNoticeCenter";
import { useConfirmDialog } from "@/components/shared/useConfirmDialog";
import { DashboardShell } from "@/widgets/dashboard/components/DashboardShell";
import { DashboardSidebar } from "@/widgets/dashboard/components/DashboardSidebar";
import { DashboardUtilityRail } from "@/widgets/dashboard/components/DashboardUtilityRail";
import { AdminTopbar } from "@/widgets/dashboard/components/AdminTopbar";
import { DashboardTour } from "@/widgets/dashboard/_components/DashboardTour";
import { useDashboardTour } from "@/widgets/dashboard/hooks/useDashboardTour";
import { ROUTES } from "@/app/routes";

export function AdminDashboardLayout(): JSX.Element {
    const auth = useAuth();
    const notice = useNoticeCenter();
    const { confirm } = useConfirmDialog();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();
    const tour = useDashboardTour({
        role: "admin",
        navigate,
        pathname: location.pathname,
        setSidebarOpen
    });

    async function handleLogout(): Promise<void> {
        const accepted = await confirm({
            title: "Keluar dari HashBox?",
            description: "Sesi admin akan ditutup dan Anda perlu login kembali untuk membuka dashboard.",
            confirmLabel: "Keluar",
            variant: "danger"
        });
        if (!accepted) {
            return;
        }

        await auth.logout();
        notice.show({ variant: "success", message: "Anda berhasil logout." });
        navigate(ROUTES.auth.login, { replace: true });
    }

    if (!auth.user) {
        return <div />;
    }

    return (
        <>
            {tour.running ? (
                <DashboardTour
                    run={tour.running}
                    stepIndex={tour.stepIndex}
                    steps={tour.steps}
                    onEvent={tour.onEvent}
                />
            ) : null}
            <DashboardShell
                sidebarOpen={sidebarOpen}
                onSidebarClose={() => setSidebarOpen(false)}
                sidebar={(
                    <DashboardSidebar
                        role="admin"
                        onClose={() => setSidebarOpen(false)}
                    />
                )}
                topbar={(
                    <AdminTopbar
                        user={auth.user}
                        onMenuClick={() => setSidebarOpen(true)}
                        onLogout={() => void handleLogout()}
                    />
                )}
            >
                <Outlet />
                <DashboardUtilityRail user={auth.user} variant="admin" onStartTour={tour.start} />
            </DashboardShell>
        </>
    );
}
