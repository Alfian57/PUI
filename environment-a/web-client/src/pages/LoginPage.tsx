import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LoginCard } from "@/features/auth/components/LoginCard";
import { useAuth } from "@/features/auth/context/AuthSessionProvider";
import { useNoticeCenter } from "@/shared/contexts/NoticeProvider";
import { toErrorMessage } from "@/shared/lib/errorMessage";

type LocationState = {
    from?: {
        pathname?: string;
    };
    registerSuccess?: boolean;
};

export function LoginPage(): JSX.Element {
    const auth = useAuth();
    const notice = useNoticeCenter();
    const navigate = useNavigate();
    const location = useLocation();
    const [loginError, setLoginError] = useState<string | null>(null);

    async function handleLogin(email: string, password: string): Promise<void> {
        setLoginError(null);
        try {
            const response = await auth.login({ email, password });
            const state = location.state as LocationState | null;
            notice.show({
                variant: "success",
                message: `Selamat datang kembali, ${response.user.full_name}.`
            });
            const fallbackPath = response.user.role === "admin" ? "/app/analytics" : "/app/files";
            navigate(state?.from?.pathname ?? fallbackPath, { replace: true });
        } catch (cause) {
            const message = toErrorMessage(cause, "Email atau password belum cocok. Periksa kembali lalu coba lagi.");
            setLoginError(message === "unauthorized" ? "Email atau password belum cocok. Periksa kembali lalu coba lagi." : message);
        }
    }

    const state = location.state as LocationState | null;

    return (
        <main className="h-[100dvh] overflow-hidden bg-brand-sky text-brand-ink">
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -left-16 top-0 h-72 w-72 rounded-full bg-brand-amber/25 blur-3xl" />
                <div className="absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-brand-mint/55 blur-3xl" />
                <div className="absolute left-1/2 top-1/3 h-56 w-56 -translate-x-1/2 rounded-full bg-brand-sky/65 blur-3xl" />
            </div>

            <div className="relative mx-auto h-full max-w-7xl px-3 py-3 sm:px-5 lg:px-7">
                <LoginCard
                    loading={auth.loginState.isPending}
                    restoringSession={auth.isRestoringSession}
                    errorMessage={loginError}
                    successMessage={state?.registerSuccess ? "Akun berhasil dibuat. Silakan masuk menggunakan email dan password Anda." : null}
                    onSubmit={handleLogin}
                />
            </div>
        </main>
    );
}
