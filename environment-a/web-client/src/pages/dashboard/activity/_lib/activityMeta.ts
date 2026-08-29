import {
    ArrowDownToLine,
    Clock3,
    FolderPlus,
    KeyRound,
    LogIn,
    LogOut,
    RotateCcw,
    Star,
    Trash2,
    UploadCloud,
    UserRound,
    XCircle,
    type LucideIcon
} from "lucide-react";

export const ACTION_LABELS: Record<string, string> = {
    LOGIN: "Masuk ke akun",
    REGISTER: "Akun dibuat",
    LOGOUT: "Keluar dari akun",
    UPLOAD: "Unggah berkas",
    UPLOAD_FAILED: "Unggah gagal",
    DOWNLOAD: "Unduh berkas",
    DOWNLOAD_TRASHED: "Unduh berkas dari Sampah",
    REQUEST_PASSWORD_RESET: "Minta reset password",
    CONFIRM_PASSWORD_RESET: "Konfirmasi reset password",
    DELETE_SOFT: "Berkas dihapus",
    DELETE_FILE_PERMANENT: "Berkas dihapus permanen",
    DELETE_DIRECTORY_SOFT: "Direktori dihapus",
    DELETE_DIRECTORY_PERMANENT: "Direktori dihapus permanen",
    RESTORE_FILE: "Berkas dipulihkan",
    RESTORE_DIRECTORY: "Direktori dipulihkan",
    STAR_FILE: "Berkas diberi bintang",
    UNSTAR_FILE: "Bintang berkas dihapus",
    STAR_DIRECTORY: "Direktori diberi bintang",
    UNSTAR_DIRECTORY: "Bintang direktori dihapus",
    CREATE_DIRECTORY: "Direktori dibuat",
    UPDATE_PROFILE: "Profil diperbarui"
};

export const ACTION_DESCRIPTIONS: Record<string, string> = {
    LOGIN: "Sesi HashBox berhasil dimulai.",
    REGISTER: "Akun pengguna baru berhasil dibuat.",
    LOGOUT: "Sesi HashBox ditutup.",
    UPLOAD: "Berkas baru ditambahkan ke penyimpanan.",
    UPLOAD_FAILED: "Unggah berkas tidak berhasil diproses.",
    DOWNLOAD: "Berkas diunduh dari HashBox.",
    DOWNLOAD_TRASHED: "Berkas dari Sampah diunduh dari HashBox.",
    REQUEST_PASSWORD_RESET: "Tautan reset password diminta.",
    CONFIRM_PASSWORD_RESET: "Password berhasil diperbarui melalui proses reset.",
    DELETE_SOFT: "Berkas dipindahkan ke Sampah.",
    DELETE_FILE_PERMANENT: "Berkas dihapus permanen dari Sampah.",
    DELETE_DIRECTORY_SOFT: "Direktori dipindahkan ke Sampah.",
    DELETE_DIRECTORY_PERMANENT: "Direktori dihapus permanen dari Sampah.",
    RESTORE_FILE: "Berkas dikembalikan dari Sampah.",
    RESTORE_DIRECTORY: "Direktori dikembalikan dari Sampah.",
    STAR_FILE: "Berkas ditambahkan ke daftar Berbintang.",
    UNSTAR_FILE: "Berkas dihapus dari daftar Berbintang.",
    STAR_DIRECTORY: "Direktori ditambahkan ke daftar Berbintang.",
    UNSTAR_DIRECTORY: "Bintang direktori dihapus.",
    CREATE_DIRECTORY: "Direktori baru ditambahkan.",
    UPDATE_PROFILE: "Informasi akun diperbarui."
};

export type ActivityActionMeta = {
    icon: LucideIcon;
    tone: string;
    badge: string;
};

export const ACTION_META: Record<string, ActivityActionMeta> = {
    LOGIN: {
        icon: LogIn,
        tone: "bg-brand-mint text-brand-success",
        badge: "Akun"
    },
    REGISTER: {
        icon: UserRound,
        tone: "bg-brand-mint text-brand-success",
        badge: "Akun"
    },
    LOGOUT: {
        icon: LogOut,
        tone: "bg-brand-sky text-brand-steel",
        badge: "Akun"
    },
    UPLOAD: {
        icon: UploadCloud,
        tone: "bg-brand-sky text-brand-steel",
        badge: "Berkas"
    },
    UPLOAD_FAILED: {
        icon: XCircle,
        tone: "bg-brand-coral/10 text-brand-coral",
        badge: "Berkas"
    },
    DOWNLOAD: {
        icon: ArrowDownToLine,
        tone: "bg-brand-mint text-brand-success",
        badge: "Berkas"
    },
    DOWNLOAD_TRASHED: {
        icon: ArrowDownToLine,
        tone: "bg-brand-mint text-brand-success",
        badge: "Sampah"
    },
    REQUEST_PASSWORD_RESET: {
        icon: KeyRound,
        tone: "bg-brand-sky text-brand-steel",
        badge: "Akun"
    },
    CONFIRM_PASSWORD_RESET: {
        icon: KeyRound,
        tone: "bg-brand-mint text-brand-success",
        badge: "Akun"
    },
    DELETE_SOFT: {
        icon: Trash2,
        tone: "bg-brand-coral/10 text-brand-coral",
        badge: "Berkas"
    },
    DELETE_FILE_PERMANENT: {
        icon: Trash2,
        tone: "bg-brand-coral/10 text-brand-coral",
        badge: "Berkas"
    },
    DELETE_DIRECTORY_SOFT: {
        icon: Trash2,
        tone: "bg-brand-coral/10 text-brand-coral",
        badge: "Direktori"
    },
    DELETE_DIRECTORY_PERMANENT: {
        icon: Trash2,
        tone: "bg-brand-coral/10 text-brand-coral",
        badge: "Direktori"
    },
    RESTORE_FILE: {
        icon: RotateCcw,
        tone: "bg-brand-mint text-brand-success",
        badge: "Berkas"
    },
    RESTORE_DIRECTORY: {
        icon: RotateCcw,
        tone: "bg-brand-mint text-brand-success",
        badge: "Direktori"
    },
    STAR_FILE: {
        icon: Star,
        tone: "bg-brand-amber/15 text-brand-ink",
        badge: "Berkas"
    },
    UNSTAR_FILE: {
        icon: Star,
        tone: "bg-brand-amber/15 text-brand-ink",
        badge: "Berkas"
    },
    STAR_DIRECTORY: {
        icon: Star,
        tone: "bg-brand-amber/15 text-brand-ink",
        badge: "Direktori"
    },
    UNSTAR_DIRECTORY: {
        icon: Star,
        tone: "bg-brand-amber/15 text-brand-ink",
        badge: "Direktori"
    },
    CREATE_DIRECTORY: {
        icon: FolderPlus,
        tone: "bg-brand-amber/15 text-brand-ink",
        badge: "Direktori"
    },
    UPDATE_PROFILE: {
        icon: UserRound,
        tone: "bg-brand-sky text-brand-steel",
        badge: "Profil"
    }
};

export const DEFAULT_ACTIVITY_META: ActivityActionMeta = {
    icon: Clock3,
    tone: "bg-brand-sky text-brand-steel",
    badge: "Aktivitas"
};
