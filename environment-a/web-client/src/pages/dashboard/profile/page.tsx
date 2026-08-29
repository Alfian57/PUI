import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useBlocker } from "react-router-dom";
import { useAuth } from "@/pages/auth/_hooks/useAuth";
import { useNoticeCenter } from "@/shared/contexts/useNoticeCenter";
import { toErrorMessage } from "@/shared/lib/errorMessage";
import { useConfirmDialog } from "@/components/shared/useConfirmDialog";
import { ProfileForm } from "@/pages/dashboard/profile/_components/ProfileForm";
import { ProfileIdentityCard } from "@/pages/dashboard/profile/_components/ProfileIdentityCard";

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
                <h1 className="font-display text-3xl font-semibold text-brand-logoBlue">Profil</h1>
                <p className="mt-1 text-sm text-brand-steel">Perbarui identitas akun dan password HashBox Anda.</p>
            </section>

            <section className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
                <ProfileIdentityCard user={user} />
                <ProfileForm
                    fullName={fullName}
                    email={email}
                    currentPassword={currentPassword}
                    newPassword={newPassword}
                    confirmPassword={confirmPassword}
                    formError={formError}
                    dirty={dirty}
                    loading={auth.updateProfileState.isPending}
                    onFullNameChange={setFullName}
                    onEmailChange={setEmail}
                    onCurrentPasswordChange={setCurrentPassword}
                    onNewPasswordChange={setNewPassword}
                    onConfirmPasswordChange={setConfirmPassword}
                    onCancel={() => void handleCancel()}
                    onSubmit={handleSubmit}
                />
            </section>
        </div>
    );
}
