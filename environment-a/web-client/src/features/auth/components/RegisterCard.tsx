import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff } from "lucide-react";
import {
    AuthShell,
    authIconButtonClass,
    authInputClass,
    authLinkClass,
    authPasswordInputClass,
    authPrimaryButtonClass,
    authStatusClass
} from "@/features/auth/components/AuthShell";

type RegisterCardProps = {
    onSubmit: (fullName: string, email: string, password: string, confirmPassword: string) => Promise<void>;
    loading: boolean;
    errorMessage?: string | null;
};

export function RegisterCard({ onSubmit, loading, errorMessage }: RegisterCardProps): JSX.Element {
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const passwordReady = password.length >= 8;
    const passwordMatch = confirmPassword.length === 0 || password === confirmPassword;
    const disabled = loading;
    async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
        event.preventDefault();
        await onSubmit(fullName, email, password, confirmPassword);
    }

    return (
        <AuthShell
            eyebrow="Daftar Pengguna"
            title="Buat akun HashBox"
            description="Siapkan akun untuk mengunggah, mengatur folder, dan membaca riwayat penyimpanan Anda."
            panelBadge="Akun pengguna baru"
            panelTitle="Mulai ruang kerja berkas pribadi yang rapi sejak hari pertama."
            panelDescription="Setiap akun pengguna mendapat area kerja sendiri untuk menyimpan file, memantau metadata, dan mengakses pemulihan."
        >
            {loading ? (
                <p className="mt-3 rounded-xl border border-brand-line bg-white px-4 py-2 text-sm font-medium text-brand-steel">
                    Sedang membuat ruang kerja HashBox Anda...
                </p>
            ) : null}

            <form className="mt-4 space-y-2.5" onSubmit={(event) => void handleSubmit(event)}>
                {errorMessage ? (
                    <div className={`${authStatusClass} border-brand-coral/25 bg-brand-coral/10 text-brand-coral`} role="alert">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        <p>{errorMessage}</p>
                    </div>
                ) : null}

                <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-brand-logoBlue">Nama lengkap</span>
                    <input
                        className={authInputClass}
                        type="text"
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        autoComplete="name"
                        placeholder="Contoh: Andi Pratama"
                        minLength={2}
                        maxLength={150}
                        disabled={disabled}
                        required
                    />
                </label>

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
                            autoComplete="new-password"
                            placeholder="Minimal 8 karakter"
                            minLength={8}
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
                    <span className={passwordReady ? "mt-1 block text-xs text-brand-success" : "mt-1 block text-xs text-brand-steel"}>
                        {passwordReady ? "Password sudah memenuhi panjang minimal." : "Minimal 8 karakter."}
                    </span>
                </label>

                <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-brand-logoBlue">Konfirmasi password</span>
                    <input
                        className={authInputClass}
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        autoComplete="new-password"
                        placeholder="Ulangi password"
                        disabled={disabled}
                        required
                    />
                    <span className={passwordMatch ? "mt-1 block text-xs text-brand-steel" : "mt-1 block text-xs text-brand-coral"}>
                        {passwordMatch ? "Pastikan sama dengan password di atas." : "Konfirmasi password belum sama."}
                    </span>
                </label>

                <button className={authPrimaryButtonClass} type="submit" disabled={disabled || !passwordReady || !passwordMatch}>
                    {loading ? "Membuat akun..." : "Daftar"}
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
                </button>
            </form>

            <p className="mt-4 text-center text-sm text-brand-steel">
                Sudah punya akun?{" "}
                <Link className={authLinkClass} to="/login">
                    Masuk ke HashBox
                </Link>
            </p>
        </AuthShell>
    );
}
