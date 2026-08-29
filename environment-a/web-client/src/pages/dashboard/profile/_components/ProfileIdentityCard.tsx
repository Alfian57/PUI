import { UserCircle } from "lucide-react";
import { UserAvatar } from "@/components/shared/UserAvatar";
import type { AuthUser } from "@/shared/types/auth";

type ProfileIdentityCardProps = {
    user: AuthUser | null;
};

export function ProfileIdentityCard({ user }: ProfileIdentityCardProps): JSX.Element {
    return (
        <aside className="rounded-[1.75rem] bg-white p-5 shadow-soft ring-1 ring-brand-line/70">
            <div className="flex items-center gap-4">
                <UserAvatar name={user?.full_name ?? "HashBox"} size="md" />
                <div className="min-w-0">
                    <p className="truncate font-display text-xl font-semibold text-brand-logoBlue">{user?.full_name}</p>
                    <p className="truncate text-sm text-brand-steel">{user?.email}</p>
                </div>
            </div>
            <div className="mt-6 rounded-2xl bg-brand-sky/70 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-brand-logoBlue">
                    <UserCircle className="h-4 w-4" aria-hidden="true" />
                    Akun aktif
                </div>
                <p className="mt-2 text-sm leading-6 text-brand-steel">
                    Gunakan data yang mudah dikenali agar aktivitas berkas tetap jelas saat Anda membuka riwayat.
                </p>
            </div>
        </aside>
    );
}
