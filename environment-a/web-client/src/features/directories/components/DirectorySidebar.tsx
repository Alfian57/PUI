import clsx from "clsx";
import type { DirectoryRecord } from "@/shared/types/domain";

type DirectorySidebarProps = {
    directories: DirectoryRecord[];
    selectedDirectoryID: string | null;
    loading: boolean;
    onSelect: (directoryID: string) => void;
    onRefresh: () => Promise<void>;
    onOpenCreate: () => void;
};

export function DirectorySidebar({
    directories,
    selectedDirectoryID,
    loading,
    onSelect,
    onRefresh,
    onOpenCreate
}: DirectorySidebarProps): JSX.Element {
    return (
        <section className="rounded-2xl border border-brand-steel/20 bg-white/85 p-5 shadow-soft backdrop-blur">
            <header className="mb-4 flex items-center justify-between">
                <div>
                    <p className="font-display text-[11px] uppercase tracking-[0.28em] text-brand-steel">Directory</p>
                    <h3 className="font-display text-xl text-brand-ink">Tree Explorer</h3>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => void onRefresh()}
                        className="rounded-lg border border-brand-steel/25 px-3 py-1.5 text-sm text-brand-steel hover:bg-brand-sky"
                    >
                        Refresh
                    </button>
                    <button
                        type="button"
                        onClick={onOpenCreate}
                        className="rounded-lg bg-brand-ink px-3 py-1.5 text-sm font-medium text-brand-mint hover:bg-brand-steel"
                    >
                        Folder Baru
                    </button>
                </div>
            </header>

            <div className="max-h-[30rem] space-y-1 overflow-auto pr-1">
                {loading ? <p className="text-sm text-brand-steel/80">Memuat direktori...</p> : null}
                {!loading && directories.length === 0 ? (
                    <p className="text-sm text-brand-steel/80">Belum ada direktori.</p>
                ) : null}

                {directories.map((directory) => (
                    <button
                        key={directory.id}
                        type="button"
                        onClick={() => onSelect(directory.id)}
                        className={clsx(
                            "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition",
                            selectedDirectoryID === directory.id
                                ? "bg-brand-ink text-brand-mint"
                                : "text-brand-ink hover:bg-brand-sky"
                        )}
                        style={{ paddingLeft: `${0.75 + directory.depth * 0.8}rem` }}
                    >
                        <span className="font-mono text-xs opacity-70">{String(directory.depth).padStart(2, "0")}</span>
                        <span className="truncate text-sm">{directory.name}</span>
                    </button>
                ))}
            </div>
        </section>
    );
}
