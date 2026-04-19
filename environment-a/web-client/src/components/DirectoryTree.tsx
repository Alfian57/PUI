import type { DirectoryRecord } from "../types";

type Props = {
    directories: DirectoryRecord[];
    selectedDirectoryID: string | null;
    onSelect: (directoryID: string) => void;
    onOpenCreateFolder: () => void;
    onRefresh: () => Promise<void>;
    loading: boolean;
};

export function DirectoryTree({
    directories,
    selectedDirectoryID,
    onSelect,
    onOpenCreateFolder,
    onRefresh,
    loading
}: Props) {
    return (
        <section className="panel">
            <header className="panel-header">
                <div>
                    <p className="eyebrow">Directories</p>
                    <h2>Tree Direktori</h2>
                </div>
                <div className="inline-actions">
                    <button type="button" onClick={() => void onRefresh()} disabled={loading}>
                        Refresh
                    </button>
                    <button type="button" onClick={onOpenCreateFolder}>
                        Folder Baru
                    </button>
                </div>
            </header>

            <div className="tree-list" role="tree" aria-label="directory-tree">
                {directories.length === 0 ? (
                    <p className="status-muted">Belum ada direktori. Buat root folder pertama.</p>
                ) : (
                    directories.map((directory) => (
                        <button
                            type="button"
                            key={directory.id}
                            className={`tree-node ${selectedDirectoryID === directory.id ? "tree-node--active" : ""}`}
                            style={{ paddingLeft: `${0.85 + directory.depth * 1.15}rem` }}
                            onClick={() => onSelect(directory.id)}
                        >
                            <span className="tree-node-name">{directory.name}</span>
                            <span className="tree-node-meta">depth {directory.depth}</span>
                        </button>
                    ))
                )}
            </div>
        </section>
    );
}
