import type { FormEvent } from "react";
import { KeyRound, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProfileField } from "@/pages/dashboard/profile/_components/ProfileField";

type ProfileFormProps = {
    fullName: string;
    email: string;
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
    formError: string | null;
    dirty: boolean;
    loading: boolean;
    onFullNameChange: (value: string) => void;
    onEmailChange: (value: string) => void;
    onCurrentPasswordChange: (value: string) => void;
    onNewPasswordChange: (value: string) => void;
    onConfirmPasswordChange: (value: string) => void;
    onCancel: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

export function ProfileForm({
    fullName,
    email,
    currentPassword,
    newPassword,
    confirmPassword,
    formError,
    dirty,
    loading,
    onFullNameChange,
    onEmailChange,
    onCurrentPasswordChange,
    onNewPasswordChange,
    onConfirmPasswordChange,
    onCancel,
    onSubmit
}: ProfileFormProps): JSX.Element {
    return (
        <form className="rounded-[1.75rem] bg-white p-5 shadow-soft ring-1 ring-brand-line/70" onSubmit={(event) => void onSubmit(event)}>
            <div className="grid gap-4 sm:grid-cols-2">
                <ProfileField label="Nama lengkap">
                    <input
                        type="text"
                        value={fullName}
                        onChange={(event) => onFullNameChange(event.target.value)}
                        placeholder="Contoh: Operator HashBox"
                        minLength={2}
                        maxLength={150}
                        required
                        className="h-12 w-full rounded-2xl border border-brand-steel/15 bg-white px-4 text-sm outline-none transition focus:border-brand-logoBlue/40 focus:ring-2 focus:ring-brand-logoYellow/35"
                    />
                </ProfileField>

                <ProfileField label="Email">
                    <input
                        type="email"
                        value={email}
                        onChange={(event) => onEmailChange(event.target.value)}
                        placeholder="operator@gmail.com"
                        required
                        className="h-12 w-full rounded-2xl border border-brand-steel/15 bg-white px-4 text-sm outline-none transition focus:border-brand-logoBlue/40 focus:ring-2 focus:ring-brand-logoYellow/35"
                    />
                </ProfileField>
            </div>

            <div className="mt-6 rounded-2xl bg-brand-sky/70 p-4 ring-1 ring-brand-line/70">
                <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-brand-steel" aria-hidden="true" />
                    <h2 className="font-display text-lg font-semibold text-brand-logoBlue">Password</h2>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <ProfileField label="Password saat ini">
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(event) => onCurrentPasswordChange(event.target.value)}
                            placeholder="Masukkan password saat ini"
                            className="h-12 w-full rounded-2xl border border-brand-steel/15 bg-white px-4 text-sm outline-none transition focus:border-brand-logoBlue/40 focus:ring-2 focus:ring-brand-logoYellow/35"
                        />
                    </ProfileField>
                    <ProfileField label="Password baru">
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(event) => onNewPasswordChange(event.target.value)}
                            placeholder="Minimal 8 karakter"
                            minLength={newPassword ? 8 : undefined}
                            className="h-12 w-full rounded-2xl border border-brand-steel/15 bg-white px-4 text-sm outline-none transition focus:border-brand-logoBlue/40 focus:ring-2 focus:ring-brand-logoYellow/35"
                        />
                    </ProfileField>
                    <ProfileField label="Konfirmasi password">
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(event) => onConfirmPasswordChange(event.target.value)}
                            placeholder="Ulangi password baru"
                            className="h-12 w-full rounded-2xl border border-brand-steel/15 bg-white px-4 text-sm outline-none transition focus:border-brand-logoBlue/40 focus:ring-2 focus:ring-brand-logoYellow/35"
                        />
                    </ProfileField>
                </div>
            </div>

            {formError ? (
                <p className="mt-4 rounded-2xl bg-brand-coral/10 px-4 py-3 text-sm font-medium text-brand-coral">{formError}</p>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="secondary" onClick={onCancel}>
                    Batal
                </Button>
                <Button
                    type="submit"
                    disabled={!dirty || loading}
                    icon={<Save className="h-4 w-4" aria-hidden="true" />}
                >
                    {loading ? "Menyimpan..." : "Simpan profil"}
                </Button>
            </div>
        </form>
    );
}
