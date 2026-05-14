import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import {
    ArrowDownToLine,
    Clock3,
    FolderPlus,
    LogIn,
    LogOut,
    RotateCcw,
    Star,
    Trash2,
    UploadCloud,
    UserRound,
    XCircle
} from "lucide-react";
import { http } from "@/shared/api/http";
import { queryKeys } from "@/shared/lib/queryKeys";
import { formatDate } from "@/shared/lib/format";

type ActivityLog = {
    id: string;
    action: string;
    resource_type: string;
    resource_id?: string | null;
    created_at: string;
};

const ACTION_LABELS: Record<string, string> = {
    LOGIN: "Masuk ke akun",
    REGISTER: "Akun dibuat",
    LOGOUT: "Keluar dari akun",
    UPLOAD: "Unggah berkas",
    UPLOAD_FAILED: "Unggah gagal",
    DOWNLOAD: "Unduh berkas",
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

const ACTION_DESCRIPTIONS: Record<string, string> = {
    LOGIN: "Sesi HashBox berhasil dimulai.",
    REGISTER: "Akun pengguna baru berhasil dibuat.",
    LOGOUT: "Sesi HashBox ditutup.",
    UPLOAD: "Berkas baru ditambahkan ke penyimpanan.",
    UPLOAD_FAILED: "Unggah berkas tidak berhasil diproses.",
    DOWNLOAD: "Berkas diunduh dari HashBox.",
    DELETE_SOFT: "Berkas dipindahkan ke Sampah.",
    DELETE_FILE_PERMANENT: "Berkas dihapus permanen dari Sampah.",
    DELETE_DIRECTORY_SOFT: "Direktori dipindahkan ke Sampah.",
    DELETE_DIRECTORY_PERMANENT: "Direktori dihapus permanen dari Sampah.",
    RESTORE_FILE: "Berkas dikembalikan dari Sampah.",
    RESTORE_DIRECTORY: "Direktori dikembalikan dari Sampah.",
    STAR_FILE: "Berkas ditambahkan ke daftar Berbintang.",
    UNSTAR_FILE: "Berkas dihapus dari daftar Berbintang.",
    STAR_DIRECTORY: "Direktori ditambahkan ke daftar Berbintang.",
    UNSTAR_DIRECTORY: "Direktori dihapus dari daftar Berbintang.",
    CREATE_DIRECTORY: "Direktori baru ditambahkan.",
    UPDATE_PROFILE: "Informasi akun diperbarui."
};

const ACTION_META: Record<string, { icon: JSX.Element; tone: string; badge: string }> = {
    LOGIN: {
        icon: <LogIn className="h-4 w-4" aria-hidden="true" />,
        tone: "bg-brand-mint text-brand-success",
        badge: "Akun"
    },
    REGISTER: {
        icon: <UserRound className="h-4 w-4" aria-hidden="true" />,
        tone: "bg-brand-mint text-brand-success",
        badge: "Akun"
    },
    LOGOUT: {
        icon: <LogOut className="h-4 w-4" aria-hidden="true" />,
        tone: "bg-brand-sky text-brand-steel",
        badge: "Akun"
    },
    UPLOAD: {
        icon: <UploadCloud className="h-4 w-4" aria-hidden="true" />,
        tone: "bg-brand-sky text-brand-steel",
        badge: "Berkas"
    },
    UPLOAD_FAILED: {
        icon: <XCircle className="h-4 w-4" aria-hidden="true" />,
        tone: "bg-brand-coral/10 text-brand-coral",
        badge: "Berkas"
    },
    DOWNLOAD: {
        icon: <ArrowDownToLine className="h-4 w-4" aria-hidden="true" />,
        tone: "bg-brand-mint text-brand-success",
        badge: "Berkas"
    },
    DELETE_SOFT: {
        icon: <Trash2 className="h-4 w-4" aria-hidden="true" />,
        tone: "bg-brand-coral/10 text-brand-coral",
        badge: "Berkas"
    },
    DELETE_FILE_PERMANENT: {
        icon: <Trash2 className="h-4 w-4" aria-hidden="true" />,
        tone: "bg-brand-coral/10 text-brand-coral",
        badge: "Berkas"
    },
    DELETE_DIRECTORY_SOFT: {
        icon: <Trash2 className="h-4 w-4" aria-hidden="true" />,
        tone: "bg-brand-coral/10 text-brand-coral",
        badge: "Direktori"
    },
    DELETE_DIRECTORY_PERMANENT: {
        icon: <Trash2 className="h-4 w-4" aria-hidden="true" />,
        tone: "bg-brand-coral/10 text-brand-coral",
        badge: "Direktori"
    },
    RESTORE_FILE: {
        icon: <RotateCcw className="h-4 w-4" aria-hidden="true" />,
        tone: "bg-brand-mint text-brand-success",
        badge: "Berkas"
    },
    RESTORE_DIRECTORY: {
        icon: <RotateCcw className="h-4 w-4" aria-hidden="true" />,
        tone: "bg-brand-mint text-brand-success",
        badge: "Direktori"
    },
    STAR_FILE: {
        icon: <Star className="h-4 w-4" aria-hidden="true" />,
        tone: "bg-brand-amber/15 text-brand-ink",
        badge: "Berkas"
    },
    UNSTAR_FILE: {
        icon: <Star className="h-4 w-4" aria-hidden="true" />,
        tone: "bg-brand-amber/15 text-brand-ink",
        badge: "Berkas"
    },
    STAR_DIRECTORY: {
        icon: <Star className="h-4 w-4" aria-hidden="true" />,
        tone: "bg-brand-amber/15 text-brand-ink",
        badge: "Direktori"
    },
    UNSTAR_DIRECTORY: {
        icon: <Star className="h-4 w-4" aria-hidden="true" />,
        tone: "bg-brand-amber/15 text-brand-ink",
        badge: "Direktori"
    },
    CREATE_DIRECTORY: {
        icon: <FolderPlus className="h-4 w-4" aria-hidden="true" />,
        tone: "bg-brand-amber/15 text-brand-ink",
        badge: "Direktori"
    },
    UPDATE_PROFILE: {
        icon: <UserRound className="h-4 w-4" aria-hidden="true" />,
        tone: "bg-brand-sky text-brand-steel",
        badge: "Profil"
    }
};

async function fetchActivityLogs(page: number): Promise<{ activity_logs: ActivityLog[]; total: number }> {
    const limit = 15;
    const offset = page * limit;
    const { data } = await http.get<{ activity_logs: ActivityLog[]; total: number }>(
        `/api/v1/activity-logs?limit=${limit}&offset=${offset}`
    );
    return data;
}

export function ActivityLogPanel(): JSX.Element {
    const [page, setPage] = useState(0);

    const { data, isLoading } = useQuery({
        queryKey: queryKeys.activity.list(page),
        queryFn: () => fetchActivityLogs(page)
    });

    const logs = data?.activity_logs ?? [];
    const total = data?.total ?? 0;
    const hasMore = (page + 1) * 15 < total;

    return (
        <section className="rounded-[1.75rem] border border-brand-steel/10 bg-white p-5 shadow-soft">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="font-display text-[11px] uppercase tracking-[0.24em] text-brand-steel">Riwayat</p>
                    <h3 className="mt-1 font-display text-xl font-semibold text-brand-ink">Aktivitas Terakhir</h3>
                </div>
                <p className="text-xs font-medium text-brand-steel">{total} aktivitas</p>
            </div>

            {isLoading ? (
                <div className="mt-5 space-y-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="h-20 animate-pulse rounded-2xl bg-gradient-to-r from-white via-brand-sky/70 to-white bg-[length:200%_100%]" />
                    ))}
                </div>
            ) : null}

            {!isLoading && logs.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-dashed border-brand-steel/20 bg-brand-sky/55 px-5 py-8 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-sky text-brand-steel">
                        <Clock3 className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <p className="mt-3 font-display text-lg font-semibold text-brand-ink">Belum ada aktivitas</p>
                    <p className="mt-1 text-sm text-brand-steel">Aktivitas akun akan muncul di sini.</p>
                </div>
            ) : null}

            {logs.length > 0 ? (
                <div className="mt-5 space-y-3">
                    {logs.map((log) => <ActivityItem key={log.id} log={log} />)}
                </div>
            ) : null}

            {(hasMore || page > 0) ? (
                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        disabled={page === 0}
                        onClick={() => setPage((p) => p - 1)}
                        className="rounded-2xl border border-brand-steel/20 px-4 py-2 text-sm font-semibold text-brand-steel transition hover:bg-brand-sky disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        Sebelumnya
                    </button>
                    <button
                        type="button"
                        disabled={!hasMore}
                        onClick={() => setPage((p) => p + 1)}
                        className="rounded-2xl border border-brand-steel/20 px-4 py-2 text-sm font-semibold text-brand-steel transition hover:bg-brand-sky disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        Selanjutnya
                    </button>
                </div>
            ) : null}
        </section>
    );
}

type ActivityItemProps = {
    log: ActivityLog;
};

function ActivityItem({ log }: ActivityItemProps): JSX.Element {
    const meta = ACTION_META[log.action] ?? {
        icon: <Clock3 className="h-4 w-4" aria-hidden="true" />,
        tone: "bg-brand-sky text-brand-steel",
        badge: log.resource_type || "Aktivitas"
    };

    return (
        <article className="group rounded-2xl border border-brand-steel/10 bg-brand-sky/55 px-4 py-3 transition duration-200 hover:-translate-y-0.5 hover:border-brand-amber/35 hover:bg-white hover:shadow-soft">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                    <div className={clsx("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition group-hover:scale-105", meta.tone)}>
                        {meta.icon}
                    </div>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-semibold text-brand-ink">{ACTION_LABELS[log.action] ?? log.action}</h4>
                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-steel ring-1 ring-brand-steel/10">
                                {meta.badge}
                            </span>
                        </div>
                        <p className="mt-1 text-sm leading-5 text-brand-steel">
                            {ACTION_DESCRIPTIONS[log.action] ?? "Aktivitas akun tercatat."}
                        </p>
                    </div>
                </div>

                <time className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-brand-steel ring-1 ring-brand-steel/10 sm:text-right">
                    {formatDate(log.created_at)}
                </time>
            </div>
        </article>
    );
}
