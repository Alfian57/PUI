import { useAuth } from "@/pages/auth/_hooks/useAuth";
import { AdminDashboardLayout } from "@/widgets/dashboard/_components/AdminDashboardLayout";
import { UserDashboardLayout } from "@/widgets/dashboard/_components/UserDashboardLayout";

export function DashboardLayout(): JSX.Element {
    const auth = useAuth();

    if (!auth.user) {
        return <div />;
    }

    if (auth.user.role === "admin") {
        return <AdminDashboardLayout />;
    }

    return <UserDashboardLayout />;
}
