import { useEffect } from "react";
import { LoginCard } from "@/features/auth/components/LoginCard";
import { useAuthSession } from "@/features/auth/hooks/useAuthSession";
import { useHealth } from "@/features/health/hooks/useHealth";
import { env } from "@/shared/config/env";
import { useNotice } from "@/shared/hooks/useNotice";
import { toErrorMessage } from "@/shared/lib/errorMessage";
import { NoticeToast } from "@/shared/ui/NoticeToast";
import { SecureStorageDashboard } from "@/widgets/dashboard/SecureStorageDashboard";

export function AppRoot(): JSX.Element {
    const auth = useAuthSession();
    const health = useHealth();
    const notice = useNotice();

    useEffect(() => {
        if (auth.meState.isError) {
            auth.clearSession();
            notice.show({
                variant: "error",
                message: "Sesi login tidak valid, silakan masuk kembali."
            });
        }
    }, [auth.clearSession, auth.meState.isError, notice.show]);

    async function handleLogin(email: string, password: string): Promise<void> {
        try {
            const response = await auth.login({ email, password });
            notice.show({
                variant: "success",
                message: `Selamat datang, ${response.user.full_name}.`
            });
        } catch (cause) {
            notice.show({
                variant: "error",
                message: toErrorMessage(cause, "Login gagal.")
            });
        }
    }

    async function handleLogout(): Promise<void> {
        await auth.logout();
        notice.show({
            variant: "success",
            message: "Anda berhasil logout."
        });
    }

    return (
        <main className="min-h-screen bg-[#f5fbff] text-brand-ink">
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -left-16 top-0 h-72 w-72 rounded-full bg-brand-amber/25 blur-3xl" />
                <div className="absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-brand-mint/55 blur-3xl" />
                <div className="absolute left-1/2 top-1/3 h-56 w-56 -translate-x-1/2 rounded-full bg-brand-sky/65 blur-3xl" />
            </div>

            <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-8 sm:px-6 lg:px-8">
                <header className="mb-6 rounded-2xl border border-brand-steel/20 bg-white/75 px-5 py-4 shadow-soft backdrop-blur">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="font-display text-xs uppercase tracking-[0.34em] text-brand-steel">Environment A</p>
                            <h1 className="mt-1 font-display text-3xl text-brand-ink">Immutable Storage Workbench</h1>
                            <p className="mt-1 text-sm text-brand-steel/85">
                                Operasikan metadata file secara aman dengan dedup insight, struktur direktori, dan audit jalur unduh.
                            </p>
                        </div>
                        <div className="rounded-xl border border-brand-steel/20 bg-brand-sky/55 px-4 py-3 text-sm">
                            <p className="text-xs uppercase tracking-[0.2em] text-brand-steel">API Endpoint</p>
                            <p className="font-mono text-xs text-brand-ink">{env.apiBaseUrl}</p>
                        </div>
                    </div>
                </header>

                <section className="mb-6 grid gap-3 sm:grid-cols-3">
                    <article className="rounded-xl border border-brand-steel/15 bg-white/80 px-4 py-3 shadow-soft">
                        <p className="text-xs uppercase tracking-[0.2em] text-brand-steel">Runtime</p>
                        <p className="mt-1 text-sm font-medium text-brand-ink">{env.environmentName}</p>
                    </article>
                    <article className="rounded-xl border border-brand-steel/15 bg-white/80 px-4 py-3 shadow-soft">
                        <p className="text-xs uppercase tracking-[0.2em] text-brand-steel">Health Status</p>
                        <p className="mt-1 text-sm font-medium text-brand-ink">
                            {health.data?.status ?? (health.isLoading ? "Memeriksa..." : "Tidak tersedia")}
                        </p>
                    </article>
                    <article className="rounded-xl border border-brand-steel/15 bg-white/80 px-4 py-3 shadow-soft">
                        <p className="text-xs uppercase tracking-[0.2em] text-brand-steel">Health Environment</p>
                        <p className="mt-1 text-sm font-medium text-brand-ink">{health.data?.environment ?? "-"}</p>
                    </article>
                </section>

                {!auth.isAuthenticated ? (
                    <LoginCard
                        loading={auth.loginState.isPending}
                        restoringSession={auth.isRestoringSession}
                        onSubmit={handleLogin}
                    />
                ) : auth.user ? (
                    <SecureStorageDashboard
                        user={auth.user}
                        onLogout={handleLogout}
                        onError={(message) => notice.show({ variant: "error", message })}
                        onSuccess={(message) => notice.show({ variant: "success", message })}
                    />
                ) : (
                    <section className="rounded-2xl border border-brand-steel/20 bg-white/80 p-8 text-center shadow-soft">
                        <p className="text-sm text-brand-steel">Memulihkan sesi aktif...</p>
                    </section>
                )}
            </div>

            {notice.notice ? <NoticeToast notice={notice.notice} onClose={notice.dismiss} /> : null}
        </main>
    );
}
