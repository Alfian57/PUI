import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import { requestPasswordReset } from "@/features/auth/api/authApi";
import {
    AuthShell,
    authInputClass,
    authLinkClass,
    authPrimaryButtonClass,
    authStatusClass
} from "@/features/auth/components/AuthShell";
import { toErrorMessage } from "@/shared/lib/errorMessage";

export function ForgotPasswordPage(): JSX.Element {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
        event.preventDefault();
        setLoading(true);
        setErrorMessage(null);
        setSuccessMessage(null);
        try {
            await requestPasswordReset(email);
            setSuccessMessage("Jika email terdaftar, tautan reset password akan dikirim ke inbox Anda.");
        } catch (cause) {
            setErrorMessage(toErrorMessage(cause, "Permintaan reset password belum berhasil. Coba lagi sebentar lagi."));
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-[100dvh] overflow-x-hidden bg-brand-sky text-brand-ink">
            <AuthShell
                eyebrow="Pemulihan Akun"
                title="Reset password"
                description="Masukkan email akun HashBox Anda. Kami akan mengirim tautan untuk membuat password baru jika akun ditemukan."
                panelBadge="Pemulihan akses"
                panelTitle="Akses akun bisa dipulihkan tanpa membuka isi penyimpanan Anda."
                panelDescription="Tautan reset dibatasi waktu dan hanya dipakai untuk mengganti password akun HashBox."
                footer="Demi keamanan, halaman ini memberi respons yang sama untuk email terdaftar maupun tidak terdaftar."
            >
                <form className="mt-6 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
                    {errorMessage ? (
                        <div className={`${authStatusClass} border-brand-coral/25 bg-brand-coral/10 text-brand-coral`} role="alert">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                            <p>{errorMessage}</p>
                        </div>
                    ) : null}

                    {successMessage ? (
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
                            disabled={loading}
                            required
                        />
                    </label>

                    <button className={authPrimaryButtonClass} type="submit" disabled={loading}>
                        {loading ? "Mengirim tautan..." : "Kirim tautan reset"}
                        <Mail className="h-4 w-4" aria-hidden="true" />
                    </button>
                </form>

                <p className="mt-5 text-center text-sm text-brand-steel">
                    <Link className={`inline-flex items-center gap-2 ${authLinkClass}`} to="/login">
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                        Kembali ke login
                    </Link>
                </p>
            </AuthShell>
        </main>
    );
}
