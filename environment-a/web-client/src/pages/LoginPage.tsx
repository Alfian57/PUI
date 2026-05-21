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
    resetSuccess?: boolean;
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
        <main className="min-h-[100dvh] overflow-x-hidden bg-brand-sky text-brand-ink">
            <LoginCard
                loading={auth.loginState.isPending}
                restoringSession={auth.isRestoringSession}
                errorMessage={loginError}
                successMessage={
                    state?.resetSuccess
                        ? "Password berhasil diperbarui. Silakan masuk menggunakan password baru Anda."
                        : state?.registerSuccess
                            ? "Akun berhasil dibuat. Silakan masuk menggunakan email dan password Anda."
                            : null
                }
                onSubmit={handleLogin}
            />
        </main>
    );
}
