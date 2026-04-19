import type { FileRecord, UploadCommitResult } from "@/shared/types/domain";
import { formatBytes, formatDate } from "@/shared/lib/format";

type FileInspectorProps = {
    file: FileRecord | null;
    lastUploadResult: UploadCommitResult | null;
    loading: boolean;
};

export function FileInspector({ file, lastUploadResult, loading }: FileInspectorProps): JSX.Element {
    return (
        <section className="rounded-2xl border border-brand-steel/20 bg-white/85 p-5 shadow-soft backdrop-blur">
            <p className="font-display text-[11px] uppercase tracking-[0.28em] text-brand-steel">Inspector</p>
            <h3 className="mt-1 font-display text-xl text-brand-ink">Detail File</h3>

            {loading ? <p className="mt-4 text-sm text-brand-steel/80">Memuat detail...</p> : null}
            {!loading && !file ? <p className="mt-4 text-sm text-brand-steel/80">Pilih file untuk melihat detail.</p> : null}

            {file ? (
                <dl className="mt-4 space-y-3 text-sm text-brand-steel">
                    <div>
                        <dt className="font-medium text-brand-ink">Nama</dt>
                        <dd>{file.name}</dd>
                    </div>
                    <div>
                        <dt className="font-medium text-brand-ink">MIME Type</dt>
                        <dd>{file.mime_type}</dd>
                    </div>
                    <div>
                        <dt className="font-medium text-brand-ink">Ukuran</dt>
                        <dd>{formatBytes(file.size_bytes)}</dd>
                    </div>
                    <div>
                        <dt className="font-medium text-brand-ink">Manifest</dt>
                        <dd className="font-mono text-xs">{file.manifest_id}</dd>
                    </div>
                    <div>
                        <dt className="font-medium text-brand-ink">Dibuat</dt>
                        <dd>{formatDate(file.created_at)}</dd>
                    </div>
                </dl>
            ) : null}

            {lastUploadResult ? (
                <section className="mt-5 rounded-xl border border-brand-amber/40 bg-brand-amber/10 p-3">
                    <p className="text-xs uppercase tracking-[0.22em] text-brand-steel">Upload Commit</p>
                    <p className="mt-2 text-sm text-brand-ink">
                        Dedup ratio {(lastUploadResult.dedup_ratio * 100).toFixed(2)}% dengan {lastUploadResult.chunk_count} chunk.
                    </p>
                    <p className="mt-1 text-xs font-mono text-brand-steel/90">{lastUploadResult.file_hash}</p>
                </section>
            ) : null}
        </section>
    );
}
