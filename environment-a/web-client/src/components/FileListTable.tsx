import type { FileRecord } from "../types";

type Props = {
    files: FileRecord[];
    selectedFileID: string | null;
    onSelect: (fileID: string) => void;
    onDownload: (file: FileRecord) => Promise<void>;
    onSoftDelete: (file: FileRecord) => Promise<void>;
    loading: boolean;
};

function prettyBytes(size: number): string {
    if (size < 1024) {
        return `${size} B`;
    }

    if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(1)} KiB`;
    }

    if (size < 1024 * 1024 * 1024) {
        return `${(size / (1024 * 1024)).toFixed(1)} MiB`;
    }

    return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GiB`;
}

export function FileListTable({
    files,
    selectedFileID,
    onSelect,
    onDownload,
    onSoftDelete,
    loading
}: Props) {
    return (
        <section className="panel">
            <header className="panel-header">
                <div>
                    <p className="eyebrow">Objects</p>
                    <h2>Daftar File</h2>
                </div>
            </header>

            {loading ? <p className="status-muted">Memuat file...</p> : null}

            {files.length === 0 ? (
                <p className="status-muted">Tidak ada file aktif pada direktori ini.</p>
            ) : (
                <table className="file-table">
                    <thead>
                        <tr>
                            <th>Nama</th>
                            <th>Ukuran</th>
                            <th>Manifest</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {files.map((file) => (
                            <tr
                                key={file.id}
                                className={selectedFileID === file.id ? "file-row--active" : ""}
                                onClick={() => onSelect(file.id)}
                            >
                                <td>{file.name}</td>
                                <td>{prettyBytes(file.size_bytes)}</td>
                                <td>
                                    <span className="mono-ellipsis">{file.manifest_id}</span>
                                </td>
                                <td>
                                    <div className="inline-actions">
                                        <button type="button" onClick={(event) => {
                                            event.stopPropagation();
                                            void onDownload(file);
                                        }}>
                                            Unduh
                                        </button>
                                        <button type="button" className="danger" onClick={(event) => {
                                            event.stopPropagation();
                                            void onSoftDelete(file);
                                        }}>
                                            Soft Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </section>
    );
}
