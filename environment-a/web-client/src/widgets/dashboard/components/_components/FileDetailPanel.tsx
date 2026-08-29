import { useQuery } from "@tanstack/react-query";
import { MapPin, ShieldCheck } from "lucide-react";
import { getBreadcrumb } from "@/pages/dashboard/_api/directoryApi";
import { getFileManifest } from "@/pages/dashboard/_api/fileApi";
import { formatBytes, formatDate } from "@/shared/lib/format";
import { queryKeys } from "@/shared/lib/queryKeys";
import type { FileRecord, ManifestInfo, UploadCommitResult } from "@/shared/types/files";
import { getPreviewIcon } from "../_lib/filePreview";
import { FileInfoItem } from "./FileInfoItem";
import { PreviewFallback } from "./PreviewFallback";

type FileDetailPanelProps = {
    file: FileRecord | null;
    lastUploadResult: UploadCommitResult | null;
    loading: boolean;
};

export function FileDetailPanel({ file, lastUploadResult, loading }: FileDetailPanelProps): JSX.Element {
    const manifestQuery = useQuery({
        queryKey: queryKeys.files.manifest(file?.id ?? "none"),
        queryFn: () => getFileManifest(file!.id),
        enabled: Boolean(file?.id)
    });
    const breadcrumbQuery = useQuery({
        queryKey: queryKeys.directories.breadcrumb(file?.directory_id ?? "root"),
        queryFn: () => getBreadcrumb(file!.directory_id!),
        enabled: Boolean(file?.directory_id)
    });
    const manifest: ManifestInfo | null = manifestQuery.data ?? null;
    const locationPath = file?.directory_id
        ? ["Berkas Saya", ...(breadcrumbQuery.data ?? []).map((directory) => directory.name)].join(" / ")
        : "Berkas Saya";

    if (loading) {
        return <div className="h-80 animate-pulse rounded-[1.5rem] bg-gradient-to-r from-white via-brand-sky/80 to-white bg-[length:200%_100%]" />;
    }

    if (!file) {
        return <PreviewFallback title="Tidak ada berkas dipilih" description="Pilih berkas untuk melihat detailnya." />;
    }

    const PreviewIcon = getPreviewIcon(file);

    return (
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
            <div className="space-y-5">
                <section className="overflow-hidden rounded-[1.75rem] bg-white shadow-soft ring-1 ring-brand-line/70">
                    <div className="relative bg-brand-logoBlue p-5 text-white sm:p-6">
                        <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-brand-logoYellow/20" />
                        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                                <p className="font-display text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-logoYellow">Informasi Berkas</p>
                                <h3 className="mt-2 break-words font-display text-2xl font-semibold leading-tight">{file.name}</h3>
                                <p className="mt-2 text-sm text-white/70">{file.mime_type || "Berkas"} · {formatBytes(file.size_bytes)}</p>
                            </div>
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/12 text-brand-logoYellow">
                                <PreviewIcon className="h-5 w-5" aria-hidden="true" />
                            </div>
                        </div>
                    </div>
                    <dl className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
                        <FileInfoItem label="Nama" value={file.name} />
                        <FileInfoItem label="Jenis Berkas" value={file.mime_type || "-"} />
                        <FileInfoItem label="Ukuran" value={formatBytes(file.size_bytes)} />
                        <FileInfoItem label="Dibuat" value={formatDate(file.created_at)} />
                        <FileInfoItem label="Lokasi" value={breadcrumbQuery.isLoading ? "Memuat lokasi..." : locationPath} wide />
                        <FileInfoItem label="Kode Penyimpanan" value={file.manifest_id} mono wide />
                    </dl>
                </section>

                <section className="rounded-[1.75rem] bg-white p-4 shadow-soft ring-1 ring-brand-line/70 sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="font-display text-lg font-semibold text-brand-logoBlue">Metadata Vault</p>
                            <p className="mt-1 text-sm text-brand-steel">Identitas konten dan manifest immutable.</p>
                        </div>
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-logoYellow/15 text-brand-logoBlue">
                            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                        </span>
                    </div>
                    {manifest ? (
                        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                            <FileInfoItem label="Kode Verifikasi" value={manifest.file_hash} mono wide />
                            <FileInfoItem label="Jumlah Bagian Berkas" value={`${manifest.chunk_count} bagian`} />
                            <FileInfoItem label="Dibuat di Penyimpanan" value={formatDate(manifest.created_at)} />
                        </dl>
                    ) : manifestQuery.isLoading ? (
                        <p className="mt-4 rounded-2xl bg-brand-sky/70 px-4 py-3 text-sm text-brand-steel">Memuat info penyimpanan...</p>
                    ) : (
                        <p className="mt-4 rounded-2xl bg-brand-sky/70 px-4 py-3 text-sm text-brand-steel">Metadata vault belum tersedia.</p>
                    )}
                </section>
            </div>

            <aside className="space-y-4">
                <section className="rounded-[1.75rem] bg-white p-4 shadow-soft ring-1 ring-brand-line/70">
                    <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-sky text-brand-logoBlue">
                            <MapPin className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                            <p className="font-display text-base font-semibold text-brand-logoBlue">Lokasi Berkas</p>
                            <p className="mt-2 break-words text-sm leading-6 text-brand-steel">
                                {breadcrumbQuery.isLoading ? "Memuat lokasi..." : locationPath}
                            </p>
                        </div>
                    </div>
                </section>

                {manifest ? (
                    <section className="rounded-[1.75rem] bg-brand-mint/40 p-4 shadow-soft ring-1 ring-brand-mint">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-brand-success">
                                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <div>
                                <p className="font-display text-base font-semibold text-brand-logoBlue">Status Perlindungan</p>
                                <p className="text-sm text-brand-steel">{manifest.immutable ? "Terkunci immutable" : "Dapat berubah"}</p>
                            </div>
                        </div>
                    </section>
                ) : null}

                {lastUploadResult ? (
                    <section className="rounded-[1.75rem] bg-brand-logoYellow/12 p-4 shadow-soft ring-1 ring-brand-logoYellow/35">
                        <p className="font-display text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-logoBlue">Hasil Unggah Terakhir</p>
                        <p className="mt-3 text-sm leading-6 text-brand-logoBlue">
                            Efisiensi {(lastUploadResult.dedup_ratio * 100).toFixed(2)}% dengan {lastUploadResult.chunk_count} bagian berkas.
                        </p>
                        <p className="mt-3 break-all rounded-2xl bg-white/70 px-3 py-2 font-mono text-xs text-brand-steel">{lastUploadResult.file_hash}</p>
                    </section>
                ) : null}
            </aside>
        </section>
    );
}
