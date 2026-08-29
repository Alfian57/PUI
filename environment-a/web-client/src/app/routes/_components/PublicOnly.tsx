import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/pages/auth/_hooks/useAuth";
import { ROUTES } from "@/app/routes";

export function PublicOnly(): JSX.Element {
    const auth = useAuth();

    if (auth.isRestoringSession) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-brand-sky text-sm font-medium text-brand-steel">
                Membuka HashBox...
            </div>
        );
    }

    if (auth.user) {
        return <Navigate to={auth.user.role === "admin" ? ROUTES.app.analytics.root : ROUTES.app.files} replace />;
    }

    return <Outlet />;
}
