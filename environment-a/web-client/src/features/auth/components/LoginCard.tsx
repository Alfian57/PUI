import { FormEvent, useState } from "react";

type LoginCardProps = {
    onSubmit: (email: string, password: string) => Promise<void>;
    loading: boolean;
    restoringSession: boolean;
};

export function LoginCard({ onSubmit, loading, restoringSession }: LoginCardProps): JSX.Element {
    const [email, setEmail] = useState("ops@pui.local");
    const [password, setPassword] = useState("password");

    async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
        event.preventDefault();
        await onSubmit(email, password);
    }

    return (
        <section className="mx-auto w-full max-w-md animate-rise-in rounded-3xl border border-brand-steel/20 bg-white/85 p-8 shadow-deck backdrop-blur">
            <p className="font-display text-xs uppercase tracking-[0.35em] text-brand-steel">PUI Secure Storage</p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-brand-ink">Masuk ke Control Room</h2>
            <p className="mt-2 text-sm text-brand-steel/80">
                Masuk untuk mengelola metadata file immutable, folder kerja, dan audit upload.
            </p>

            <form className="mt-8 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
                <label className="block">
                    <span className="mb-1 block text-sm font-medium text-brand-ink">Email</span>
                    <input
                        className="w-full rounded-xl border border-brand-steel/25 bg-white px-3 py-2.5 text-brand-ink outline-none ring-brand-amber transition focus:ring-2"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                    />
                </label>

                <label className="block">
                    <span className="mb-1 block text-sm font-medium text-brand-ink">Password</span>
                    <input
                        className="w-full rounded-xl border border-brand-steel/25 bg-white px-3 py-2.5 text-brand-ink outline-none ring-brand-amber transition focus:ring-2"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                    />
                </label>

                <button
                    className="w-full rounded-xl bg-brand-ink px-4 py-2.5 font-semibold text-brand-mint transition hover:-translate-y-0.5 hover:bg-brand-steel disabled:cursor-not-allowed disabled:opacity-50"
                    type="submit"
                    disabled={loading || restoringSession}
                >
                    {loading ? "Memproses..." : restoringSession ? "Memulihkan sesi..." : "Masuk"}
                </button>
            </form>
        </section>
    );
}
