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
        <main className="min-h-[100dvh] overflow-x-hidden bg-brand-sky text-brand-ink">
            <RegisterCard
                loading={auth.registerState.isPending}
                errorMessage={registerError}
                onSubmit={handleRegister}
            />
        </main>
    );
}
