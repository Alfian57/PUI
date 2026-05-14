import { useQuery } from "@tanstack/react-query";
import { getFileManifest } from "@/features/files/api/fileApi";
import { formatBytes, formatDate } from "@/shared/lib/format";
import { queryKeys } from "@/shared/lib/queryKeys";
import type { FileRecord, ManifestInfo, UploadCommitResult } from "@/shared/types/domain";

type FileInspectorProps = {
    file: FileRecord | null;
    lastUploadResult: UploadCommitResult | null;
    loading: boolean;
};

export function FileInspector({ file, lastUploadResult, loading }: FileInspectorProps): JSX.Element {
    const manifestQuery = useQuery({
        queryKey: queryKeys.files.manifest(file?.id ?? "none"),
        queryFn: () => getFileManifest(file!.id),
        enabled: Boolean(file?.id)
    });

    const manifest: ManifestInfo | null = manifestQuery.data ?? null;

    return (
        <section className="rounded-3xl border border-brand-steel/15 bg-white/90 p-5 shadow-soft backdrop-blur">
            <p className="font-display text-[11px] uppercase tracking-[0.24em] text-brand-steel">Detail Berkas</p>
            <h3 className="mt-1 font-display text-xl font-semibold text-brand-ink">Informasi Berkas</h3>

            {loading ? <p className="mt-4 text-sm text-brand-steel/80">Memuat detail...</p> : null}
            {!loading && !file ? <p className="mt-4 text-sm text-brand-steel/80">Pilih berkas untuk melihat detail.</p> : null}

            {file ? (
                <dl className="mt-4 space-y-3 text-sm text-brand-steel">
                    <div>
                        <dt className="font-medium text-brand-ink">Nama</dt>
                        <dd>{file.name}</dd>
                    </div>
                    <div>
                        <dt className="font-medium text-brand-ink">Jenis Berkas</dt>
                        <dd>{file.mime_type}</dd>
                    </div>
                    <div>
                        <dt className="font-medium text-brand-ink">Ukuran</dt>
                        <dd>{formatBytes(file.size_bytes)}</dd>
                    </div>
                    <div>
                        <dt className="font-medium text-brand-ink">Kode Penyimpanan</dt>
                        <dd className="font-mono text-xs break-all">{file.manifest_id}</dd>
                    </div>
                    <div>
                        <dt className="font-medium text-brand-ink">Dibuat</dt>
                        <dd>{formatDate(file.created_at)}</dd>
                    </div>

                    {manifest ? (
                        <>
                            <div className="rounded-lg border border-brand-mint/60 bg-brand-mint/20 px-3 py-2">
                                <dt className="font-medium text-brand-ink">Status Perlindungan</dt>
                                <dd className="mt-1 flex items-center gap-2">
                                    <span className="text-lg">🔒</span>
                                    <span className="font-semibold text-brand-ink">
                                        {manifest.immutable ? "Terkunci" : "Dapat Berubah"}
                                    </span>
                                </dd>
                            </div>
                            <div>
                                <dt className="font-medium text-brand-ink">Kode Verifikasi</dt>
                                <dd className="font-mono text-xs break-all">{manifest.file_hash}</dd>
                            </div>
                            <div>
                                <dt className="font-medium text-brand-ink">Jumlah Bagian Berkas</dt>
                                <dd>{manifest.chunk_count} bagian</dd>
                            </div>
                        </>
                    ) : manifestQuery.isLoading ? (
                        <p className="text-xs text-brand-steel/70">Memuat info penyimpanan...</p>
                    ) : null}
                </dl>
            ) : null}

            {lastUploadResult ? (
                <section className="mt-5 rounded-xl border border-brand-amber/40 bg-brand-amber/10 p-3">
                    <p className="text-xs uppercase tracking-[0.22em] text-brand-steel">Hasil Unggah Terakhir</p>
                    <p className="mt-2 text-sm text-brand-ink">
                        Efisiensi {(lastUploadResult.dedup_ratio * 100).toFixed(2)}% dengan {lastUploadResult.chunk_count} bagian berkas.
                    </p>
                    <p className="mt-1 text-xs font-mono text-brand-steel/90">{lastUploadResult.file_hash}</p>
                </section>
            ) : null}
        </section>
    );
}
