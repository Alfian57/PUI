import { FormEvent, useState } from "react";

type Props = {
    isLoading: boolean;
    onSubmit: (email: string, password: string) => Promise<void>;
};

export function LoginPanel({ isLoading, onSubmit }: Props) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        await onSubmit(email.trim(), password);
    }

    return (
        <section className="panel login-panel">
            <p className="eyebrow">Authentication</p>
            <h2>Login ke Control Plane</h2>
            <form className="form-grid" onSubmit={handleSubmit}>
                <label>
                    Email
                    <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                    />
                </label>
                <label>
                    Password
                    <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                    />
                </label>
                <button type="submit" disabled={isLoading}>
                    {isLoading ? "Memproses..." : "Masuk"}
                </button>
            </form>
            <p className="hint-text">Jika butuh bootstrap lokal, jalankan seed dev_admin.sql terlebih dahulu.</p>
        </section>
    );
}
