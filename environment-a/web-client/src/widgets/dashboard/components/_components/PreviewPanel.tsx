import { FileAudio } from "lucide-react";
import type { FileRecord } from "@/shared/types/files";
import type { PreviewKind } from "../_types/filePreview";
import { PreviewFallback } from "./PreviewFallback";

type PreviewPanelProps = {
    file: FileRecord | null;
    kind: PreviewKind;
    loading: boolean;
    error: string | null;
    objectURL: string | null;
    textPreview: string | null;
    onDownload: (file: FileRecord) => Promise<void>;
};

export function PreviewPanel({
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
