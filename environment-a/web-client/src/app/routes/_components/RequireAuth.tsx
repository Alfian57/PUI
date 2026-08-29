import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/pages/auth/_hooks/useAuth";
import { ROUTES } from "@/app/routes";

export function RequireAuth(): JSX.Element {
    const auth = useAuth();
    const location = useLocation();

    if (auth.isRestoringSession) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-brand-sky text-sm font-medium text-brand-steel">
                Membuka HashBox...
            </div>
        );
    }

    if (!auth.user) {
        return <Navigate to={ROUTES.auth.login} replace state={{ from: location }} />;
    }

    return <Outlet />;
}
