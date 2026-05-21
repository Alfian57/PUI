import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound } from "lucide-react";
import { confirmPasswordReset } from "@/features/auth/api/authApi";
import {
    AuthShell,
    authIconButtonClass,
    authInputClass,
    authLinkClass,
    authPasswordInputClass,
    authPrimaryButtonClass,
    authStatusClass
} from "@/features/auth/components/AuthShell";
import { useNoticeCenter } from "@/shared/contexts/NoticeProvider";
import { toErrorMessage } from "@/shared/lib/errorMessage";

export function ResetPasswordPage(): JSX.Element {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const notice = useNoticeCenter();
    const token = searchParams.get("token")?.trim() ?? "";
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const passwordReady = password.length >= 8;
    const passwordMatch = confirmPassword.length === 0 || password === confirmPassword;
    const canSubmit = Boolean(token) && passwordReady && passwordMatch && !loading;
    const helperMessage = useMemo(() => {
        if (!token) return "Token reset tidak ditemukan. Minta tautan reset baru dari halaman lupa password.";
        if (!passwordReady) return "Buat password baru minimal 8 karakter.";
        if (!passwordMatch) return "Konfirmasi password belum sama.";
        return "Password baru siap disimpan.";
    }, [passwordMatch, passwordReady, token]);

    async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
        event.preventDefault();
        if (!canSubmit) {
            return;
        }

        setLoading(true);
        setErrorMessage(null);
        try {
            await confirmPasswordReset({
                token,
                new_password: password,
                confirm_password: confirmPassword
            });
            notice.show({
                variant: "success",
                message: "Password berhasil diperbarui. Silakan masuk kembali."
            });
            navigate("/login", { replace: true, state: { resetSuccess: true } });
        } catch (cause) {
            setErrorMessage(toErrorMessage(cause, "Password belum berhasil diperbarui. Periksa tautan reset lalu coba lagi."));
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-[100dvh] overflow-x-hidden bg-brand-sky text-brand-ink">
            <AuthShell
                eyebrow="Password Baru"
                title="Buat password baru"
                description="Gunakan password baru untuk mengamankan kembali akses ke workspace HashBox Anda."
                panelBadge="Token reset terbatas"
                panelTitle="Reset password mencabut sesi lama dan menjaga akses tetap terkendali."
                panelDescription="Setelah password berubah, gunakan kredensial baru untuk membuka kembali dashboard."
                footer="Tautan reset hanya berlaku satu kali dan akan kedaluwarsa sesuai batas waktu server."
            >
                <p className="mt-4 rounded-xl border border-brand-line bg-white px-4 py-2.5 text-sm font-medium text-brand-steel">
                    {helperMessage}
                </p>

                <form className="mt-6 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
                    {errorMessage ? (
                        <div className={`${authStatusClass} border-brand-coral/25 bg-brand-coral/10 text-brand-coral`} role="alert">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                            <p>{errorMessage}</p>
                        </div>
                    ) : null}

                    {!token ? (
                        <div className={`${authStatusClass} border-brand-coral/25 bg-brand-coral/10 text-brand-coral`} role="alert">
                            <KeyRound className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                            <p>Tautan reset tidak memiliki token. Minta tautan baru untuk melanjutkan.</p>
                        </div>
                    ) : null}

                    <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-brand-logoBlue">Password baru</span>
                        <div className="relative">
                            <input
                                className={authPasswordInputClass}
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                autoComplete="new-password"
                                placeholder="Minimal 8 karakter"
                                minLength={8}
                                disabled={loading || !token}
                                required
                            />
                            <button
                                className={authIconButtonClass}
                                type="button"
                                onClick={() => setShowPassword((current) => !current)}
                                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                                disabled={loading || !token}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                            </button>
                        </div>
                    </label>

                    <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-brand-logoBlue">Konfirmasi password</span>
                        <input
                            className={authInputClass}
                            type={showPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            autoComplete="new-password"
                            placeholder="Ulangi password baru"
                            disabled={loading || !token}
                            required
                        />
                        <span className={passwordMatch ? "mt-1.5 block text-xs text-brand-steel" : "mt-1.5 block text-xs text-brand-coral"}>
                            {passwordMatch ? "Pastikan sama dengan password baru." : "Konfirmasi password belum sama."}
                        </span>
                    </label>

                    <button className={authPrimaryButtonClass} type="submit" disabled={!canSubmit}>
                        {loading ? "Menyimpan password..." : "Simpan password baru"}
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
                    </button>
                </form>

                <p className="mt-5 text-center text-sm text-brand-steel">
                    <Link className={`inline-flex items-center gap-2 ${authLinkClass}`} to={token ? "/login" : "/forgot-password"}>
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                        {token ? "Kembali ke login" : "Minta tautan reset baru"}
                    </Link>
                </p>
            </AuthShell>
        </main>
    );
}
