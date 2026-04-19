import { FormEvent, useMemo, useState } from "react";
import type { DirectoryRecord } from "../types";

type Props = {
    open: boolean;
    directories: DirectoryRecord[];
    defaultParentID: string | null;
    loading: boolean;
    onClose: () => void;
    onCreate: (name: string, parentID: string | null) => Promise<void>;
};

export function CreateFolderDialog({
    open,
    directories,
    defaultParentID,
    loading,
    onClose,
    onCreate
}: Props) {
    const [name, setName] = useState("");
    const [parentID, setParentID] = useState<string>(defaultParentID ?? "");

    const sortedDirectories = useMemo(() => {
        return [...directories].sort((a, b) => {
            if (a.depth !== b.depth) {
                return a.depth - b.depth;
            }

            return a.name.localeCompare(b.name);
        });
    }, [directories]);

    if (!open) {
        return null;
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        await onCreate(name.trim(), parentID || null);
        setName("");
    }

    return (
        <div className="dialog-backdrop" role="dialog" aria-modal="true">
            <div className="dialog-card">
                <header>
                    <p className="eyebrow">Directory</p>
                    <h3>Buat Folder Baru</h3>
                </header>
                <form onSubmit={handleSubmit} className="form-grid">
                    <label>
                        Nama Folder
                        <input
                            type="text"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            maxLength={255}
                            required
                        />
                    </label>
                    <label>
                        Parent
                        <select
                            value={parentID}
                            onChange={(event) => setParentID(event.target.value)}
                        >
                            <option value="">(Root)</option>
                            {sortedDirectories.map((directory) => (
                                <option value={directory.id} key={directory.id}>
                                    {`${"  ".repeat(directory.depth)}${directory.name}`}
                                </option>
                            ))}
                        </select>
                    </label>

                    <div className="inline-actions">
                        <button type="button" onClick={onClose} disabled={loading}>
                            Batal
                        </button>
                        <button type="submit" disabled={loading || name.trim() === ""}>
                            {loading ? "Menyimpan..." : "Simpan"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
