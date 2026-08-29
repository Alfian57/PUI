import { Folder, FolderOpen } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/shared/lib/format";
import type { DirectoryRecord } from "@/shared/types/directories";

type FolderGridProps = {
    folders: DirectoryRecord[];
    loading: boolean;
    onOpen: (directoryID: string) => void;
    onCreateFolder: () => void;
};

export function FolderGrid({ folders, loading, onOpen, onCreateFolder }: FolderGridProps): JSX.Element {
    if (loading) {
        return (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-20 rounded-2xl bg-white shadow-soft">
                        <div className="h-full animate-pulse rounded-2xl bg-gradient-to-r from-white via-brand-sky/70 to-white bg-[length:200%_100%]" />
                    </div>
                ))}
            </div>
        );
    }

    if (folders.length === 0) {
        return (
            <div className="rounded-[1.75rem] border border-dashed border-brand-steel/20 bg-white">
                <EmptyState
                    icon={<FolderOpen className="h-7 w-7" aria-hidden="true" />}
                    title="Belum ada direktori di sini"
                    description="Buat direktori untuk merapikan berkas berdasarkan kebutuhan Anda."
                    action={<Button onClick={onCreateFolder}>Buat direktori</Button>}
                />
            </div>
        );
    }

    return (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {folders.map((folder) => (
                <button
                    key={folder.id}
                    type="button"
                    onClick={() => onOpen(folder.id)}
                    className="group flex min-h-20 items-center gap-3 rounded-2xl border border-brand-steel/10 bg-white px-4 py-3 text-left shadow-soft transition duration-200 hover:-translate-y-0.5 hover:border-brand-amber/45 hover:shadow-deck focus:outline-none focus:ring-2 focus:ring-brand-amber/70"
                >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-amber/15 text-brand-amber transition group-hover:bg-brand-amber group-hover:text-white">
                        <Folder className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-brand-ink">{folder.name}</span>
                        <span className="mt-1 block text-xs text-brand-steel">Dibuat {formatDate(folder.created_at)}</span>
                    </span>
                </button>
            ))}
        </div>
    );
}
