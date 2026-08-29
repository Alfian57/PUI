import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "@/app/routes";
import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { AuthShell } from "@/pages/auth/_components/AuthShell";
import {
    authIconButtonClass,
    authLinkClass,
    authPasswordInputClass,
    authPrimaryButtonClass,
    authInputClass,
    authStatusClass
} from "@/pages/auth/_styles/authStyles";

type LoginCardProps = {
    onSubmit: (email: string, password: string) => Promise<void>;
    loading: boolean;
    restoringSession: boolean;
    errorMessage?: string | null;
    successMessage?: string | null;
};

export function LoginCard({
    onSubmit,
    loading,
    restoringSession,
    errorMessage,
    successMessage
}: LoginCardProps): JSX.Element {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const disabled = loading || restoringSession;
    const helperMessage = restoringSession
        ? "Sebentar, kami sedang membuka kembali sesi Anda."
        : loading
            ? "Sedang memeriksa akun Anda dengan aman..."
            : null;

    async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
        event.preventDefault();
        await onSubmit(email, password);
    }

    return (
        <AuthShell
            eyebrow="Akun Pengguna"
            title="Masuk ke HashBox"
            description="Buka ruang kerja penyimpanan immutable untuk mengelola, menelusuri, dan memulihkan berkas penting Anda."
            panelBadge="Akses workspace aman"
            panelTitle="Kelola cadangan penting dalam ruang penyimpanan yang mudah dipantau."
            panelDescription="HashBox menjaga alur masuk tetap sederhana sambil mempertahankan batas akses untuk file, folder, dan aktivitas."
            footer="File Anda tetap tersusun dalam folder pribadi dan dapat diunduh kembali saat dibutuhkan."
        >
            {helperMessage ? (
                <p className="mt-4 rounded-2xl border border-brand-line bg-white px-4 py-2.5 text-sm font-medium text-brand-steel">
                    {helperMessage}
                </p>
            ) : null}

            <form className="mt-6 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
                {errorMessage ? (
                    <div className={`${authStatusClass} border-brand-coral/25 bg-brand-coral/10 text-brand-coral`} role="alert">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        <p>{errorMessage}</p>
                    </div>
                ) : null}

                {!errorMessage && successMessage ? (
                    <div className={`${authStatusClass} border-brand-success/25 bg-brand-mint text-brand-logoBlue`} role="status">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        <p>{successMessage}</p>
                    </div>
                ) : null}

                <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-brand-logoBlue">Email</span>
                    <input
                        className={authInputClass}
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        autoComplete="email"
                        placeholder="nama@email.com"
                        disabled={disabled}
                        required
                    />
                </label>

                <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-brand-logoBlue">Password</span>
                    <div className="relative">
                        <input
                            className={authPasswordInputClass}
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            autoComplete="current-password"
                            placeholder="Masukkan password akun Anda"
                            disabled={disabled}
                            required
                        />
                        <button
                            className={authIconButtonClass}
                            type="button"
                            onClick={() => setShowPassword((current) => !current)}
                            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                            disabled={disabled}
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                        </button>
                    </div>
                </label>

                <div className="flex justify-end">
                    <Link className={`${authLinkClass} text-sm`} to={ROUTES.auth.forgotPassword}>
                        Lupa password?
                    </Link>
                </div>

                <button className={authPrimaryButtonClass} type="submit" disabled={disabled}>
                    {loading ? "Sedang memeriksa akun..." : restoringSession ? "Membuka kembali sesi..." : "Masuk"}
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
                </button>
            </form>

            <p className="mt-5 text-center text-sm text-brand-steel">
                Belum punya akun?{" "}
                <Link className={authLinkClass} to={ROUTES.auth.register}>
                    Daftar sebagai pengguna
                </Link>
            </p>
        </AuthShell>
    );
}
