import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import {
    AlertCircle,
    ArrowRight,
    CheckCircle2,
    Eye,
    EyeOff,
    Fingerprint,
    FolderLock,
    ShieldCheck
} from "lucide-react";

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
            : password
                ? "Password sudah terisi. Tekan Masuk untuk melanjutkan."
                : null;

    async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
        event.preventDefault();
        await onSubmit(email, password);
    }

    return (
        <section className="mx-auto flex h-full w-full max-w-6xl animate-rise-in items-center">
            <div className="grid h-[min(41rem,calc(100dvh-2rem))] min-h-0 w-full overflow-hidden rounded-3xl border border-brand-steel/15 bg-white shadow-deck lg:grid-cols-[1.02fr_0.98fr]">
                <div className="relative hidden h-full min-h-0 overflow-hidden bg-brand-ink lg:block">
                    <img
                        src="/auth-immutable-storage.png"
                        alt="Visualisasi brankas penyimpanan immutable"
                        className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-ink via-brand-ink/45 to-transparent" />
                    <div className="absolute inset-x-7 bottom-7">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
                            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                            Penyimpanan berkas aman
                        </div>
                        <h2 className="mt-4 max-w-md font-display text-3xl font-semibold leading-tight text-white">
                            Simpan berkas penting dalam ruang kerja yang mudah dipantau.
                        </h2>
                        <div className="mt-5 grid grid-cols-3 gap-3 text-white">
                            <div className="rounded-2xl border border-white/15 bg-white/12 p-3 backdrop-blur">
                                <FolderLock className="h-5 w-5" aria-hidden="true" />
                                <p className="mt-3 text-xs font-medium">Berkas tersimpan</p>
                            </div>
                            <div className="rounded-2xl border border-white/15 bg-white/12 p-3 backdrop-blur">
                                <Fingerprint className="h-5 w-5" aria-hidden="true" />
                                <p className="mt-3 text-xs font-medium">Ruang efisien</p>
                            </div>
                            <div className="rounded-2xl border border-white/15 bg-white/12 p-3 backdrop-blur">
                                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                                <p className="mt-3 text-xs font-medium">Aktivitas jelas</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex h-full min-h-0 flex-col justify-between overflow-y-auto bg-brand-sky/45 p-5 sm:p-6 lg:p-7">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-soft">
                                <img
                                    src="/hashbox-logo.png"
                                    alt="HashBox"
                                    className="h-full w-full object-cover"
                                />
                            </div>
                            <div>
                                <p className="font-display text-lg font-semibold text-brand-ink">HashBox</p>
                                <p className="text-xs font-medium text-brand-steel">Penyimpanan Aman</p>
                            </div>
                        </div>
                    </div>

                    <div className="mx-auto w-full max-w-md py-4">
                        <div className="lg:hidden">
                            <div className="mb-4 overflow-hidden rounded-2xl border border-brand-steel/15 bg-brand-ink">
                                <img
                                    src="/auth-immutable-storage.png"
                                    alt="Visualisasi brankas penyimpanan immutable"
                                    className="h-28 w-full object-cover opacity-95"
                                />
                            </div>
                        </div>

                        <p className="font-display text-xs uppercase tracking-[0.28em] text-brand-steel">Akun Pengguna</p>
                        <h1 className="mt-2 font-display text-3xl font-semibold leading-tight text-brand-ink">
                            Masuk ke HashBox
                        </h1>
                        <p className="mt-2 text-sm leading-6 text-brand-steel">
                            Kelola berkas penting Anda dengan ruang penyimpanan yang rapi, aman, dan mudah ditelusuri kembali.
                        </p>
                        {helperMessage ? (
                            <p className="mt-3 rounded-2xl border border-brand-steel/10 bg-white px-4 py-2.5 text-sm font-medium text-brand-steel">
                                {helperMessage}
                            </p>
                        ) : null}

                        <form className="mt-5 space-y-3.5" onSubmit={(event) => void handleSubmit(event)}>
                            {errorMessage ? (
                                <div
                                    className="flex gap-3 rounded-2xl border border-brand-coral/25 bg-brand-coral/10 px-4 py-3 text-sm text-brand-coral"
                                    role="alert"
                                >
                                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                                    <p>{errorMessage}</p>
                                </div>
                            ) : null}

                            {!errorMessage && successMessage ? (
                                <div
                                    className="flex gap-3 rounded-2xl border border-brand-success/25 bg-brand-mint px-4 py-3 text-sm text-brand-ink"
                                    role="status"
                                >
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                                    <p>{successMessage}</p>
                                </div>
                            ) : null}

                            <label className="block">
                                <span className="mb-2 block text-sm font-semibold text-brand-ink">Email</span>
                                <input
                                    className="h-11 w-full rounded-2xl border border-brand-steel/20 bg-white px-4 text-brand-ink outline-none ring-brand-amber transition placeholder:text-brand-steel/45 focus:border-brand-ink/30 focus:ring-2 disabled:cursor-not-allowed disabled:bg-brand-sky/40"
                                    type="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    autoComplete="email"
                                    placeholder="nama@email.com"
                                    disabled={disabled}
                                    required
                                />
                                <span className="mt-1.5 block text-xs text-brand-steel">
                                    Gunakan email yang terdaftar di HashBox.
                                </span>
                            </label>

                            <label className="block">
                                <span className="mb-2 block text-sm font-semibold text-brand-ink">Password</span>
                                <div className="relative">
                                    <input
                                        className="h-11 w-full rounded-2xl border border-brand-steel/20 bg-white px-4 pr-12 text-brand-ink outline-none ring-brand-amber transition placeholder:text-brand-steel/45 focus:border-brand-ink/30 focus:ring-2 disabled:cursor-not-allowed disabled:bg-brand-sky/40"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        autoComplete="current-password"
                                        placeholder="Masukkan password akun Anda"
                                        disabled={disabled}
                                        required
                                    />
                                    <button
                                        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-brand-steel transition hover:bg-brand-sky focus:outline-none focus:ring-2 focus:ring-brand-amber disabled:cursor-not-allowed disabled:opacity-50"
                                        type="button"
                                        onClick={() => setShowPassword((current) => !current)}
                                        aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                                        disabled={disabled}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" aria-hidden="true" />
                                        ) : (
                                            <Eye className="h-4 w-4" aria-hidden="true" />
                                        )}
                                    </button>
                                </div>
                                <span className="mt-1.5 block text-xs text-brand-steel">
                                    Kami akan mencocokkan password tanpa menampilkannya di layar.
                                </span>
                            </label>

                            <button
                                className="group flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-brand-ink px-4 font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-brand-steel focus:outline-none focus:ring-2 focus:ring-brand-amber focus:ring-offset-2 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                                type="submit"
                                disabled={disabled}
                            >
                                {loading ? "Sedang memeriksa akun..." : restoringSession ? "Membuka kembali sesi..." : "Masuk"}
                                <ArrowRight
                                    className="h-4 w-4 transition group-hover:translate-x-0.5"
                                    aria-hidden="true"
                                />
                            </button>
                        </form>

                        <p className="mt-5 text-center text-sm text-brand-steel">
                            Belum punya akun?{" "}
                            <Link className="font-semibold text-brand-ink underline-offset-4 hover:underline" to="/register">
                                Daftar sebagai pengguna
                            </Link>
                        </p>
                    </div>

                    <div className="border-t border-brand-steel/10 pt-4 text-xs leading-5 text-brand-steel">
                        File Anda tetap tersusun dalam folder pribadi dan dapat diunduh kembali saat dibutuhkan.
                    </div>
                </div>
            </div>
        </section>
    );
}
