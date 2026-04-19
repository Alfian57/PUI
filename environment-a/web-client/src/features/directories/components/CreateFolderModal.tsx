import { FormEvent, useEffect, useState } from "react";
import type { DirectoryRecord } from "@/shared/types/domain";

type CreateFolderModalProps = {
    open: boolean;
    loading: boolean;
    directories: DirectoryRecord[];
    defaultParentID: string | null;
    onClose: () => void;
    onCreate: (name: string, parentID: string | null) => Promise<void>;
};

export function CreateFolderModal({
    open,
    loading,
    directories,
    defaultParentID,
    onClose,
    onCreate
}: CreateFolderModalProps): JSX.Element | null {
    const [name, setName] = useState("");
    const [parentID, setParentID] = useState<string | null>(defaultParentID);

    useEffect(() => {
        setParentID(defaultParentID);
    }, [defaultParentID, open]);

    if (!open) {
        return null;
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
        event.preventDefault();
        await onCreate(name, parentID);
        setName("");
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/45 p-4 backdrop-blur-sm">
            <section className="w-full max-w-md rounded-2xl border border-brand-steel/20 bg-white p-6 shadow-deck">
                <h3 className="font-display text-2xl text-brand-ink">Buat Folder</h3>
                <p className="mt-2 text-sm text-brand-steel/80">Tambahkan direktori baru ke pohon kerja.</p>

                <form className="mt-5 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
                    <label className="block">
                        <span className="mb-1 block text-sm font-medium text-brand-ink">Nama folder</span>
                        <input
                            type="text"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            className="w-full rounded-xl border border-brand-steel/25 px-3 py-2.5 outline-none ring-brand-amber focus:ring-2"
                            required
                        />
                    </label>

                    <label className="block">
                        <span className="mb-1 block text-sm font-medium text-brand-ink">Parent folder</span>
                        <select
                            value={parentID ?? ""}
                            onChange={(event) => setParentID(event.target.value || null)}
                            className="w-full rounded-xl border border-brand-steel/25 px-3 py-2.5 outline-none ring-brand-amber focus:ring-2"
                        >
                            <option value="">Root</option>
                            {directories.map((directory) => (
                                <option key={directory.id} value={directory.id}>
                                    {`${"-".repeat(directory.depth)} ${directory.name}`}
                                </option>
                            ))}
                        </select>
                    </label>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-brand-steel/25 px-3 py-2 text-sm text-brand-steel"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="rounded-lg bg-brand-ink px-4 py-2 text-sm font-semibold text-brand-mint disabled:opacity-50"
                        >
                            {loading ? "Menyimpan..." : "Simpan"}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}
