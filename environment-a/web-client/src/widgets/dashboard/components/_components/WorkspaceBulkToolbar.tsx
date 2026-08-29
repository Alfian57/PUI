import { RotateCcw, Star, StarOff, Trash2 } from "lucide-react";
import clsx from "clsx";
import type { WorkspaceBulkSelection, WorkspaceMode } from "../_types/workspace";

type WorkspaceBulkAction = (selection: WorkspaceBulkSelection) => Promise<void>;

type WorkspaceBulkToolbarProps = {
    mode: WorkspaceMode;
    selectedCount: number;
    totalCount: number;
    onToggleSelectAll: () => void;
    onRunBulkAction: (action: WorkspaceBulkAction) => Promise<void>;
    onBulkSoftDelete?: WorkspaceBulkAction;
    onBulkStar?: WorkspaceBulkAction;
    onBulkUnstar?: WorkspaceBulkAction;
    onBulkRestore?: WorkspaceBulkAction;
    onBulkPermanentDelete?: WorkspaceBulkAction;
    onClearSelection: () => void;
};

export function WorkspaceBulkToolbar({
    mode,
    selectedCount,
    totalCount,
    onToggleSelectAll,
    onRunBulkAction,
    onBulkSoftDelete,
    onBulkStar,
    onBulkUnstar,
    onBulkRestore,
    onBulkPermanentDelete,
    onClearSelection
}: WorkspaceBulkToolbarProps): JSX.Element | null {
    if (selectedCount === 0) {
        return null;
    }

    return (
        <div className={clsx(
            "mb-3 flex flex-col gap-3 rounded-2xl bg-brand-sky/70 px-4 py-3 ring-1 ring-brand-line/70 sm:flex-row sm:items-center sm:justify-between",
            "border-brand-logoYellow/40 bg-brand-logoYellow/10"
        )}>
            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={onToggleSelectAll}
                    className="rounded-xl border border-brand-steel/15 bg-white px-3 py-2 text-sm font-semibold text-brand-logoBlue transition hover:bg-brand-sky"
                >
                    {selectedCount === totalCount ? "Batalkan semua" : "Pilih semua"}
                </button>
                <p className="text-sm font-medium text-brand-steel">{selectedCount} item dipilih</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {mode === "trash" ? (
                    <>
                        {onBulkRestore ? (
                            <button
                                type="button"
                                onClick={() => void onRunBulkAction(onBulkRestore)}
                                className="inline-flex items-center gap-2 rounded-xl bg-brand-logoBlue px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-ink"
                            >
                                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                                Pulihkan
                            </button>
                        ) : null}
                        {onBulkPermanentDelete ? (
                            <button
                                type="button"
                                onClick={() => void onRunBulkAction(onBulkPermanentDelete)}
                                className="inline-flex items-center gap-2 rounded-xl border border-brand-coral/25 bg-white px-3 py-2 text-sm font-semibold text-brand-coral transition hover:bg-brand-coral/10"
                            >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                                Hapus permanen
                            </button>
                        ) : null}
                    </>
                ) : (
                    <>
                        {onBulkStar ? (
                            <button
                                type="button"
                                onClick={() => void onRunBulkAction(onBulkStar)}
                                className="inline-flex items-center gap-2 rounded-xl bg-brand-logoBlue px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-ink"
                            >
                                <Star className="h-4 w-4" aria-hidden="true" />
                                Bintangi
                            </button>
                        ) : null}
                        {onBulkUnstar ? (
                            <button
                                type="button"
                                onClick={() => void onRunBulkAction(onBulkUnstar)}
                                className="inline-flex items-center gap-2 rounded-xl border border-brand-steel/15 bg-white px-3 py-2 text-sm font-semibold text-brand-logoBlue transition hover:bg-brand-sky"
                            >
                                <StarOff className="h-4 w-4" aria-hidden="true" />
                                Hapus bintang
                            </button>
                        ) : null}
                        {onBulkSoftDelete ? (
                            <button
                                type="button"
                                onClick={() => void onRunBulkAction(onBulkSoftDelete)}
                                className="inline-flex items-center gap-2 rounded-xl border border-brand-coral/25 bg-white px-3 py-2 text-sm font-semibold text-brand-coral transition hover:bg-brand-coral/10"
                            >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                                Hapus
                            </button>
                        ) : null}
                    </>
                )}
                <button
                    type="button"
                    onClick={onClearSelection}
                    className="rounded-xl px-3 py-2 text-sm font-semibold text-brand-steel transition hover:bg-white hover:text-brand-logoBlue"
                >
                    Batal
                </button>
            </div>
        </div>
    );
}
