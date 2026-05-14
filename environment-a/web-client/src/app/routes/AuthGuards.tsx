import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/context/AuthSessionProvider";

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
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    return <Outlet />;
}

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
        return <Navigate to={auth.user.role === "admin" ? "/app/analytics" : "/app/files"} replace />;
    }

    return <Outlet />;
}

type RequireRoleProps = {
    role: "user" | "admin";
    children: ReactNode;
};

export function RequireRole({ role, children }: RequireRoleProps): JSX.Element {
    const auth = useAuth();
    if (!auth.user) {
        return <Navigate to="/login" replace />;
    }

    if (auth.user.role !== role) {
        return <Navigate to={auth.user.role === "admin" ? "/app/analytics" : "/app/files"} replace />;
    }

    return <>{children}</>;
}

export function RoleIndexRedirect(): JSX.Element {
    const auth = useAuth();
    if (!auth.user) {
        return <Navigate to="/login" replace />;
    }

    return <Navigate to={auth.user.role === "admin" ? "/app/analytics" : "/app/files"} replace />;
}
