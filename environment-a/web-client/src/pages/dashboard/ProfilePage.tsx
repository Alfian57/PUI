import { FormEvent, useEffect, useMemo, useState } from "react";
import { KeyRound, Save, UserCircle } from "lucide-react";
import { useBlocker } from "react-router-dom";
import { useAuth } from "@/features/auth/context/AuthSessionProvider";
import { useNoticeCenter } from "@/shared/contexts/NoticeProvider";
import { toErrorMessage } from "@/shared/lib/errorMessage";
import { Button } from "@/shared/ui/Button";
import { useConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { UserAvatar } from "@/shared/ui/UserAvatar";

export function ProfilePage(): JSX.Element {
    const auth = useAuth();
    const notice = useNoticeCenter();
    const { confirm } = useConfirmDialog();
    const user = auth.user;
    const [fullName, setFullName] = useState(user?.full_name ?? "");
    const [email, setEmail] = useState(user?.email ?? "");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        setFullName(user?.full_name ?? "");
        setEmail(user?.email ?? "");
    }, [user?.email, user?.full_name]);

    const dirty = useMemo(() => {
        return fullName !== (user?.full_name ?? "")
            || email !== (user?.email ?? "")
            || currentPassword.length > 0
            || newPassword.length > 0
            || confirmPassword.length > 0;
    }, [confirmPassword, currentPassword, email, fullName, newPassword, user?.email, user?.full_name]);

    const blocker = useBlocker(dirty);

    useEffect(() => {
        if (blocker.state !== "blocked") {
            return;
        }

        void (async () => {
            const accepted = await confirm({
                title: "Buang perubahan profil?",
                description: "Perubahan yang belum disimpan akan hilang jika Anda meninggalkan halaman ini.",
                confirmLabel: "Buang perubahan",
                variant: "danger"
            });

            if (accepted) {
                blocker.proceed();
            } else {
                blocker.reset();
            }
        })();
    }, [blocker, confirm]);

    function resetForm(): void {
        setFullName(user?.full_name ?? "");
        setEmail(user?.email ?? "");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setFormError(null);
    }

    async function handleCancel(): Promise<void> {
        if (!dirty) {
            resetForm();
            return;
        }

        const accepted = await confirm({
            title: "Buang perubahan profil?",
            description: "Form akan kembali ke data profil terakhir yang tersimpan.",
            confirmLabel: "Buang perubahan",
            variant: "danger"
        });

        if (accepted) {
            resetForm();
        }
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
        event.preventDefault();
        setFormError(null);

        if (newPassword && newPassword.length < 8) {
            setFormError("Password baru minimal 8 karakter.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setFormError("Konfirmasi password baru tidak sama.");
            return;
        }

        if ((newPassword || email !== user?.email) && !currentPassword) {
            setFormError("Password saat ini wajib diisi untuk mengubah email atau password.");
            return;
        }

        try {
            await auth.updateProfile({
                full_name: fullName,
                email,
                current_password: currentPassword || undefined,
                new_password: newPassword || undefined
            });
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            notice.show({ variant: "success", message: "Profil berhasil diperbarui." });
        } catch (cause) {
            setFormError(toErrorMessage(cause, "Profil gagal diperbarui."));
        }
    }

    return (
        <div className="space-y-6">
            <section>
                <h1 className="font-display text-3xl font-semibold text-brand-ink">Profil</h1>
                <p className="mt-1 text-sm text-brand-steel">Perbarui identitas akun dan password HashBox Anda.</p>
            </section>

            <section className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
                <aside className="rounded-[1.75rem] border border-brand-steel/10 bg-white p-5 shadow-soft">
                    <div className="flex items-center gap-4">
                        <UserAvatar name={user?.full_name ?? "HashBox"} size="md" />
                        <div className="min-w-0">
                            <p className="truncate font-display text-xl font-semibold text-brand-ink">{user?.full_name}</p>
                            <p className="truncate text-sm text-brand-steel">{user?.email}</p>
                        </div>
                    </div>
                    <div className="mt-6 rounded-2xl bg-brand-sky/70 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-brand-ink">
                            <UserCircle className="h-4 w-4" aria-hidden="true" />
                            Akun aktif
                        </div>
                        <p className="mt-2 text-sm leading-6 text-brand-steel">
                            Gunakan data yang mudah dikenali agar aktivitas berkas tetap jelas saat Anda membuka riwayat.
                        </p>
                    </div>
                </aside>

                <form className="rounded-[1.75rem] border border-brand-steel/10 bg-white p-5 shadow-soft" onSubmit={(event) => void handleSubmit(event)}>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <ProfileField label="Nama lengkap">
                            <input
                                type="text"
                                value={fullName}
                                onChange={(event) => setFullName(event.target.value)}
                                placeholder="Contoh: Operator HashBox"
                                minLength={2}
                                maxLength={150}
                                required
                                className="h-12 w-full rounded-2xl border border-brand-steel/15 bg-white px-4 text-sm outline-none transition focus:border-brand-amber focus:ring-2 focus:ring-brand-amber/30"
                            />
                        </ProfileField>

                        <ProfileField label="Email">
                            <input
                                type="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                placeholder="operator@gmail.com"
                                required
                                className="h-12 w-full rounded-2xl border border-brand-steel/15 bg-white px-4 text-sm outline-none transition focus:border-brand-amber focus:ring-2 focus:ring-brand-amber/30"
                            />
                        </ProfileField>
                    </div>

                    <div className="mt-6 rounded-2xl border border-brand-steel/10 bg-brand-sky/55 p-4">
                        <div className="flex items-center gap-2">
                            <KeyRound className="h-4 w-4 text-brand-steel" aria-hidden="true" />
                            <h2 className="font-display text-lg font-semibold text-brand-ink">Password</h2>
                        </div>
                        <div className="mt-4 grid gap-4 sm:grid-cols-3">
                            <ProfileField label="Password saat ini">
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(event) => setCurrentPassword(event.target.value)}
                                    placeholder="Masukkan password saat ini"
                                    className="h-12 w-full rounded-2xl border border-brand-steel/15 bg-white px-4 text-sm outline-none transition focus:border-brand-amber focus:ring-2 focus:ring-brand-amber/30"
                                />
                            </ProfileField>
                            <ProfileField label="Password baru">
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(event) => setNewPassword(event.target.value)}
                                    placeholder="Minimal 8 karakter"
                                    minLength={newPassword ? 8 : undefined}
                                    className="h-12 w-full rounded-2xl border border-brand-steel/15 bg-white px-4 text-sm outline-none transition focus:border-brand-amber focus:ring-2 focus:ring-brand-amber/30"
                                />
                            </ProfileField>
                            <ProfileField label="Konfirmasi password">
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(event) => setConfirmPassword(event.target.value)}
                                    placeholder="Ulangi password baru"
                                    className="h-12 w-full rounded-2xl border border-brand-steel/15 bg-white px-4 text-sm outline-none transition focus:border-brand-amber focus:ring-2 focus:ring-brand-amber/30"
                                />
                            </ProfileField>
                        </div>
                    </div>

                    {formError ? (
                        <p className="mt-4 rounded-2xl bg-brand-coral/10 px-4 py-3 text-sm font-medium text-brand-coral">{formError}</p>
                    ) : null}

                    <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <Button variant="secondary" onClick={() => void handleCancel()}>
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            disabled={!dirty || auth.updateProfileState.isPending}
                            icon={<Save className="h-4 w-4" aria-hidden="true" />}
                        >
                            {auth.updateProfileState.isPending ? "Menyimpan..." : "Simpan profil"}
                        </Button>
                    </div>
                </form>
            </section>
        </div>
    );
}

type ProfileFieldProps = {
    label: string;
    children: JSX.Element;
};

function ProfileField({ label, children }: ProfileFieldProps): JSX.Element {
    return (
        <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-brand-ink">{label}</span>
            {children}
        </label>
    );
}
