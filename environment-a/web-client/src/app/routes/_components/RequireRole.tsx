import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/pages/auth/_hooks/useAuth";
import { ROUTES } from "@/app/routes";

type RequireRoleProps = {
    role: "user" | "admin";
    children: ReactNode;
};

export function RequireRole({ role, children }: RequireRoleProps): JSX.Element {
    const auth = useAuth();

    if (!auth.user) {
        return <Navigate to={ROUTES.auth.login} replace />;
    }

    if (auth.user.role !== role) {
        return <Navigate to={auth.user.role === "admin" ? ROUTES.app.analytics.root : ROUTES.app.files} replace />;
    }

    return <>{children}</>;
}
