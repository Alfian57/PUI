import { RouterProvider } from "react-router-dom";
import { router } from "@/app/router";
import { AuthSessionProvider } from "@/features/auth/context/AuthSessionProvider";
import { NoticeProvider } from "@/shared/contexts/NoticeProvider";

export function AppRoot(): JSX.Element {
    return (
        <NoticeProvider>
            <AuthSessionProvider>
                <RouterProvider router={router} future={{ v7_startTransition: true }} />
            </AuthSessionProvider>
        </NoticeProvider>
    );
}
