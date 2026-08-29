import { RouterProvider } from "react-router-dom";
import { router } from "@/app/router";
import { AuthSessionProvider } from "@/pages/auth/_contexts/AuthSessionProvider";
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
