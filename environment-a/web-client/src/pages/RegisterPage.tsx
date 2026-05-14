import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RegisterCard } from "@/features/auth/components/RegisterCard";
import { useAuth } from "@/features/auth/context/AuthSessionProvider";
import { useNoticeCenter } from "@/shared/contexts/NoticeProvider";
import { toErrorMessage } from "@/shared/lib/errorMessage";

export function RegisterPage(): JSX.Element {
    const auth = useAuth();
    const notice = useNoticeCenter();
    const navigate = useNavigate();
    const [registerError, setRegisterError] = useState<string | null>(null);

    async function handleRegister(
        fullName: string,
        email: string,
        password: string,
        confirmPassword: string
    ): Promise<void> {
        setRegisterError(null);
        try {
            await auth.register({
                full_name: fullName,
                email,
                password,
                confirm_password: confirmPassword
            });
            notice.show({
                variant: "success",
                message: "Akun berhasil dibuat. Silakan masuk menggunakan email Anda."
            });
            navigate("/login", { replace: true, state: { registerSuccess: true } });
        } catch (cause) {
            const message = toErrorMessage(cause, "Pendaftaran belum berhasil. Periksa data Anda lalu coba lagi.");
            setRegisterError(
                message.endsWith(": conflict")
                    ? message.replace(": conflict", "")
                    : message
            );
        }
    }

    return (
        <main className="h-[100dvh] overflow-hidden bg-brand-sky text-brand-ink">
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -left-16 top-0 h-72 w-72 rounded-full bg-brand-amber/25 blur-3xl" />
                <div className="absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-brand-mint/55 blur-3xl" />
                <div className="absolute left-1/2 top-1/3 h-56 w-56 -translate-x-1/2 rounded-full bg-brand-sky/65 blur-3xl" />
            </div>

            <div className="relative mx-auto h-full max-w-7xl px-3 py-3 sm:px-5 lg:px-7">
                <RegisterCard
                    loading={auth.registerState.isPending}
                    errorMessage={registerError}
                    onSubmit={handleRegister}
                />
            </div>
        </main>
    );
}
