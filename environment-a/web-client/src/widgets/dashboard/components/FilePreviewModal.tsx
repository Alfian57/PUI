import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import {
    AlertCircle,
    Download,
    FileArchive,
    FileAudio,
    FileCode2,
    FileImage,
    FileText,
    FileVideo,
    Info,
    MapPin,
    ShieldCheck,
    X
} from "lucide-react";
import { getBreadcrumb } from "@/features/directories/api/directoryApi";
import { fetchFileBlob, getFileManifest } from "@/features/files/api/fileApi";
import { formatBytes, formatDate } from "@/shared/lib/format";
import { queryKeys } from "@/shared/lib/queryKeys";
import { Button } from "@/shared/ui/Button";
import { IconButton } from "@/shared/ui/IconButton";
import type { FileRecord, ManifestInfo, UploadCommitResult } from "@/shared/types/domain";

export type FileModalTab = "preview" | "detail";

const TEXT_PREVIEW_LIMIT = 2 * 1024 * 1024;

type FilePreviewModalProps = {
    open: boolean;
    tab: FileModalTab;
    file: FileRecord | null;
    lastUploadResult: UploadCommitResult | null;
    loading: boolean;
    onTabChange: (tab: FileModalTab) => void;
    onClose: () => void;
    onDownload: (file: FileRecord) => Promise<void>;
};

export function FilePreviewModal({
    open,
    tab,
    file,
    lastUploadResult,
    loading,
    onTabChange,
    onClose,
    onDownload
}: FilePreviewModalProps): JSX.Element | null {
    const [objectURL, setObjectURL] = useState<string | null>(null);
    const [textPreview, setTextPreview] = useState<string | null>(null);
    const [textError, setTextError] = useState<string | null>(null);

    const previewKind = getPreviewKind(file);
    const shouldFetchBlob = open && tab === "preview" && Boolean(file) && previewKind !== "unsupported";
    const blobQuery = useQuery({
        queryKey: queryKeys.files.preview(file?.id ?? "none"),
        queryFn: () => fetchFileBlob(file!.id),
        enabled: shouldFetchBlob,
        staleTime: 0
    });

    useEffect(() => {
        if (!blobQuery.data || !shouldFetchBlob) {
            setObjectURL(null);
            setTextPreview(null);
            setTextError(null);
            return;
        }

        if (previewKind === "text") {
            setObjectURL(null);
            if (blobQuery.data.size > TEXT_PREVIEW_LIMIT) {
                setTextPreview(null);
                setTextError("Berkas teks terlalu besar untuk ditampilkan langsung.");
                return;
            }

            let cancelled = false;
            void blobQuery.data.text().then((content) => {
                if (!cancelled) {
                    setTextPreview(content);
                    setTextError(null);
                }
            }).catch(() => {
                if (!cancelled) {
                    setTextPreview(null);
                    setTextError("Preview teks tidak dapat dibuka.");
                }
            });

            return () => {
                cancelled = true;
            };
        }

        const url = URL.createObjectURL(blobQuery.data);
        setObjectURL(url);
        setTextPreview(null);
        setTextError(null);

        return () => URL.revokeObjectURL(url);
    }, [blobQuery.data, previewKind, shouldFetchBlob]);

    useEffect(() => {
        if (!open) {
            setObjectURL(null);
            setTextPreview(null);
            setTextError(null);
        }
    }, [open]);

    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-brand-ink/45 p-3 backdrop-blur-sm sm:p-5">
            <section className="flex h-[88vh] w-full max-w-6xl animate-rise-in flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-deck">
                <header className="flex shrink-0 flex-col gap-4 border-b border-brand-steel/10 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-sky text-brand-steel">
                            {file ? getPreviewIcon(file) : <FileText className="h-5 w-5" aria-hidden="true" />}
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-steel">Preview Berkas</p>
                            <h2 className="truncate font-display text-xl font-semibold text-brand-ink">
                                {file?.name ?? "Memuat berkas..."}
                            </h2>
                            {file ? (
                                <p className="mt-1 text-sm text-brand-steel">
                                    {file.mime_type || "Berkas"} · {formatBytes(file.size_bytes)}
                                </p>
                            ) : null}
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <Button
                            variant="secondary"
                            disabled={!file}
                            icon={<Download className="h-4 w-4" aria-hidden="true" />}
                            onClick={() => {
                                if (file) void onDownload(file);
                            }}
                        >
                            Unduh
                        </Button>
                        <IconButton label="Tutup preview" icon={<X className="h-4 w-4" aria-hidden="true" />} onClick={onClose} />
                    </div>
                </header>

                <div className="flex shrink-0 gap-2 border-b border-brand-steel/10 px-5 py-3">
                    <TabButton active={tab === "preview"} onClick={() => onTabChange("preview")}>
                        Preview
                    </TabButton>
                    <TabButton active={tab === "detail"} onClick={() => onTabChange("detail")}>
                        Detail
                    </TabButton>
                </div>

                <div className="min-h-0 flex-1 overflow-auto bg-brand-sky/55 p-4 sm:p-5">
                    {tab === "preview" ? (
                        <PreviewPanel
                            file={file}
                            kind={previewKind}
                            loading={loading || blobQuery.isLoading}
                            error={blobQuery.isError ? "Preview tidak dapat dimuat." : textError}
                            objectURL={objectURL}
                            textPreview={textPreview}
                            onDownload={onDownload}
                        />
                    ) : (
                        <DetailPanel
                            file={file}
                            lastUploadResult={lastUploadResult}
                            loading={loading}
                        />
                    )}
                </div>
            </section>
        </div>
    );
}

type TabButtonProps = {
    active: boolean;
    onClick: () => void;
    children: string;
};

function TabButton({ active, onClick, children }: TabButtonProps): JSX.Element {
    return (
        <button
            type="button"
            onClick={onClick}
            className={clsx(
                "rounded-2xl px-4 py-2 text-sm font-semibold transition",
                active ? "bg-brand-ink text-white" : "text-brand-steel hover:bg-brand-sky hover:text-brand-ink"
            )}
        >
            {children}
        </button>
    );
}

type PreviewPanelProps = {
    file: FileRecord | null;
    kind: PreviewKind;
    loading: boolean;
    error: string | null;
    objectURL: string | null;
    textPreview: string | null;
    onDownload: (file: FileRecord) => Promise<void>;
};

function PreviewPanel({
    file,
    kind,
    loading,
    error,
    objectURL,
    textPreview,
    onDownload
}: PreviewPanelProps): JSX.Element {
    if (loading) {
        return <div className="h-full min-h-[28rem] animate-pulse rounded-[1.5rem] bg-gradient-to-r from-white via-brand-sky/80 to-white bg-[length:200%_100%]" />;
    }

    if (!file) {
        return <PreviewFallback title="Pilih berkas" description="Pilih berkas untuk membuka preview." />;
    }

    if (error) {
        return (
            <PreviewFallback
                title="Preview tidak tersedia"
                description={error}
                file={file}
                onDownload={onDownload}
            />
        );
    }

    if (kind === "unsupported") {
        return (
            <PreviewFallback
                title="Preview belum tersedia untuk jenis berkas ini"
                description="Berkas tetap aman tersimpan. Gunakan unduh untuk membukanya di aplikasi yang sesuai."
                file={file}
                onDownload={onDownload}
            />
        );
    }

    if (kind !== "text" && !objectURL) {
        return <PreviewFallback title="Menyiapkan preview" description="Berkas sedang disiapkan untuk ditampilkan." />;
    }

    switch (kind) {
        case "image":
            return (
                <div className="flex min-h-[28rem] items-center justify-center rounded-[1.5rem] bg-white p-4 shadow-soft">
                    <img src={objectURL!} alt={file.name} className="max-h-[65vh] max-w-full rounded-2xl object-contain" />
                </div>
            );
        case "pdf":
            return (
                <div className="h-full min-h-[32rem] overflow-hidden rounded-[1.5rem] bg-white shadow-soft">
                    <iframe title={file.name} src={objectURL!} className="h-full min-h-[32rem] w-full" />
                </div>
            );
        case "video":
            return (
                <div className="flex min-h-[28rem] items-center justify-center rounded-[1.5rem] bg-brand-ink p-4 shadow-soft">
                    <video src={objectURL!} controls className="max-h-[65vh] max-w-full rounded-2xl" />
                </div>
            );
        case "audio":
            return (
                <div className="flex min-h-[28rem] items-center justify-center rounded-[1.5rem] bg-white p-6 shadow-soft">
                    <div className="w-full max-w-xl text-center">
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2rem] bg-brand-sky text-brand-steel">
                            <FileAudio className="h-9 w-9" aria-hidden="true" />
                        </div>
                        <p className="mt-4 truncate font-display text-xl font-semibold text-brand-ink">{file.name}</p>
                        <audio src={objectURL!} controls className="mt-6 w-full" />
                    </div>
                </div>
            );
        case "text":
            return (
                <pre className="min-h-[32rem] overflow-auto whitespace-pre-wrap rounded-[1.5rem] bg-brand-ink p-5 font-mono text-sm leading-6 text-white shadow-soft">
                    {textPreview ?? "Menyiapkan preview teks..."}
                </pre>
            );
        default:
            return <PreviewFallback title="Preview belum tersedia" description="Gunakan unduh untuk membuka berkas." file={file} onDownload={onDownload} />;
    }
}

type PreviewFallbackProps = {
    title: string;
    description: string;
    file?: FileRecord;
    onDownload?: (file: FileRecord) => Promise<void>;
};

function PreviewFallback({ title, description, file, onDownload }: PreviewFallbackProps): JSX.Element {
    return (
        <div className="flex min-h-[28rem] items-center justify-center rounded-[1.5rem] border border-dashed border-brand-steel/20 bg-white p-6 text-center shadow-soft">
            <div className="max-w-md">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-brand-sky text-brand-steel">
                    <AlertCircle className="h-7 w-7" aria-hidden="true" />
                </div>
                <h3 className="mt-4 font-display text-xl font-semibold text-brand-ink">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-brand-steel">{description}</p>
                {file && onDownload ? (
                    <Button
                        className="mt-5"
                        icon={<Download className="h-4 w-4" aria-hidden="true" />}
                        onClick={() => void onDownload(file)}
                    >
                        Unduh berkas
                    </Button>
                ) : null}
            </div>
        </div>
    );
}

type DetailPanelProps = {
    file: FileRecord | null;
    lastUploadResult: UploadCommitResult | null;
    loading: boolean;
};

function DetailPanel({ file, lastUploadResult, loading }: DetailPanelProps): JSX.Element {
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

    return (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="rounded-[1.5rem] bg-white p-5 shadow-soft">
                <p className="font-display text-[11px] uppercase tracking-[0.24em] text-brand-steel">Informasi Berkas</p>
                <h3 className="mt-1 font-display text-xl font-semibold text-brand-ink">{file.name}</h3>
                <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                    <InfoItem label="Nama" value={file.name} />
                    <InfoItem label="Lokasi" value={breadcrumbQuery.isLoading ? "Memuat lokasi..." : locationPath} wide />
                    <InfoItem label="Jenis Berkas" value={file.mime_type || "-"} />
                    <InfoItem label="Ukuran" value={formatBytes(file.size_bytes)} />
                    <InfoItem label="Dibuat" value={formatDate(file.created_at)} />
                    <InfoItem label="Kode Penyimpanan" value={file.manifest_id} mono wide />
                    {manifest ? (
                        <>
                            <InfoItem label="Kode Verifikasi" value={manifest.file_hash} mono wide />
                            <InfoItem label="Jumlah Bagian Berkas" value={`${manifest.chunk_count} bagian`} />
                            <InfoItem label="Dibuat di Penyimpanan" value={formatDate(manifest.created_at)} />
                        </>
                    ) : manifestQuery.isLoading ? (
                        <p className="text-sm text-brand-steel">Memuat info penyimpanan...</p>
                    ) : null}
                </dl>
            </div>

            <aside className="space-y-4">
                <section className="rounded-[1.5rem] border border-brand-steel/10 bg-white p-4 shadow-soft">
                    <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-sky text-brand-steel">
                            <MapPin className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-brand-ink">Lokasi Berkas</p>
                            <p className="mt-1 break-words text-sm leading-5 text-brand-steel">
                                {breadcrumbQuery.isLoading ? "Memuat lokasi..." : locationPath}
                            </p>
                        </div>
                    </div>
                </section>

                {manifest ? (
                    <section className="rounded-[1.5rem] border border-brand-mint/70 bg-brand-mint/20 p-4 shadow-soft">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-brand-success">
                                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-brand-ink">Status Perlindungan</p>
                                <p className="text-sm text-brand-steel">{manifest.immutable ? "Terkunci" : "Dapat berubah"}</p>
                            </div>
                        </div>
                    </section>
                ) : null}

                {lastUploadResult ? (
                    <section className="rounded-[1.5rem] border border-brand-amber/40 bg-brand-amber/10 p-4 shadow-soft">
                        <p className="font-display text-[11px] uppercase tracking-[0.24em] text-brand-steel">Hasil Unggah Terakhir</p>
                        <p className="mt-3 text-sm text-brand-ink">
                            Efisiensi {(lastUploadResult.dedup_ratio * 100).toFixed(2)}% dengan {lastUploadResult.chunk_count} bagian berkas.
                        </p>
                        <p className="mt-2 break-all font-mono text-xs text-brand-steel">{lastUploadResult.file_hash}</p>
                    </section>
                ) : null}
            </aside>
        </section>
    );
}

type InfoItemProps = {
    label: string;
    value: string;
    mono?: boolean;
    wide?: boolean;
};

function InfoItem({ label, value, mono = false, wide = false }: InfoItemProps): JSX.Element {
    return (
        <div className={clsx("rounded-2xl bg-brand-sky/55 p-4", wide ? "sm:col-span-2" : "")}>
            <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-steel">{label}</dt>
            <dd className={clsx("mt-2 break-words text-sm text-brand-ink", mono ? "break-all font-mono text-xs" : "")}>{value}</dd>
        </div>
    );
}

type PreviewKind = "image" | "pdf" | "video" | "audio" | "text" | "unsupported";

function getPreviewKind(file: FileRecord | null): PreviewKind {
    if (!file) return "unsupported";
    const mime = file.mime_type.toLowerCase();
    const name = file.name.toLowerCase();

    if (mime.startsWith("image/")) return "image";
    if (mime === "application/pdf" || name.endsWith(".pdf")) return "pdf";
    if (mime.startsWith("video/")) return "video";
    if (mime.startsWith("audio/")) return "audio";
    if (
        mime.startsWith("text/")
        || mime.includes("json")
        || mime.includes("xml")
        || mime.includes("csv")
        || [".txt", ".md", ".json", ".csv", ".xml", ".log", ".yml", ".yaml"].some((extension) => name.endsWith(extension))
    ) {
        return "text";
    }

    return "unsupported";
}

function getPreviewIcon(file: FileRecord): JSX.Element {
    const kind = getPreviewKind(file);
    switch (kind) {
        case "image":
            return <FileImage className="h-5 w-5" aria-hidden="true" />;
        case "video":
            return <FileVideo className="h-5 w-5" aria-hidden="true" />;
        case "audio":
            return <FileAudio className="h-5 w-5" aria-hidden="true" />;
        case "text":
            return <FileCode2 className="h-5 w-5" aria-hidden="true" />;
        case "pdf":
            return <FileText className="h-5 w-5" aria-hidden="true" />;
        default:
            return <FileArchive className="h-5 w-5" aria-hidden="true" />;
    }
}
