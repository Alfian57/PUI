import type { FileRecord, UploadCommitResult } from "../types";

type Props = {
    file: FileRecord | null;
    lastUploadResult: UploadCommitResult | null;
};

function prettyDate(value?: string | null): string {
    if (!value) {
        return "-";
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleString();
}

export function FileDetailPanel({ file, lastUploadResult }: Props) {
    return (
        <section className="panel">
            <header className="panel-header">
                <div>
                    <p className="eyebrow">Detail</p>
                    <h2>File Inspector</h2>
                </div>
            </header>

            {!file ? (
                <p className="status-muted">Pilih file untuk melihat metadata detail.</p>
            ) : (
                <dl className="status-grid">
                    <div>
                        <dt>Nama</dt>
                        <dd>{file.name}</dd>
                    </div>
                    <div>
                        <dt>MIME</dt>
                        <dd>{file.mime_type}</dd>
                    </div>
                    <div>
                        <dt>Uploaded At</dt>
                        <dd>{prettyDate(file.created_at)}</dd>
                    </div>
                    <div>
                        <dt>Manifest ID</dt>
                        <dd className="mono-ellipsis">{file.manifest_id}</dd>
                    </div>
                    <div>
                        <dt>Immutable</dt>
                        <dd>yes</dd>
                    </div>
                    <div>
                        <dt>Deleted At</dt>
                        <dd>{prettyDate(file.deleted_at)}</dd>
                    </div>
                </dl>
            )}

            {lastUploadResult ? (
                <div className="upload-summary">
                    <p className="eyebrow">Upload Summary</p>
                    <p>
                        chunk_count={lastUploadResult.chunk_count} | new={lastUploadResult.new_chunk_count} | reuse={lastUploadResult.reuse_chunk_count}
                    </p>
                    <p>dedup_ratio={(lastUploadResult.dedup_ratio * 100).toFixed(2)}%</p>
                    <p className="mono-ellipsis">file_hash={lastUploadResult.file_hash}</p>
                </div>
            ) : null}
        </section>
    );
}
