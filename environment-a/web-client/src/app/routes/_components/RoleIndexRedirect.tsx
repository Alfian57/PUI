import { Navigate } from "react-router-dom";
import { useAuth } from "@/pages/auth/_hooks/useAuth";
import { ROUTES } from "@/app/routes";

export function RoleIndexRedirect(): JSX.Element {
    const auth = useAuth();

    if (!auth.user) {
        return <Navigate to={ROUTES.auth.login} replace />;
    }

    return <Navigate to={auth.user.role === "admin" ? ROUTES.app.analytics.root : ROUTES.app.files} replace />;
}
