import { Download, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { formatBytes } from "@/shared/lib/format";
import type { FileRecord, UploadCommitResult } from "@/shared/types/files";
import { useFilePreview } from "./_hooks/useFilePreview";
import { getPreviewIcon } from "./_lib/filePreview";
import { FileDetailPanel } from "./_components/FileDetailPanel";
import { PreviewPanel } from "./_components/PreviewPanel";
import { PreviewTabButton } from "./_components/PreviewTabButton";
import type { FileModalTab } from "./_types/filePreview";

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
    const {
        blobQuery,
        objectURL,
        previewKind,
        textPreview,
        textError
    } = useFilePreview({ open, tab, file });

    if (!open) {
        return null;
    }

    const PreviewIcon = file ? getPreviewIcon(file) : FileText;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-brand-ink/45 p-3 backdrop-blur-sm sm:p-5">
            <section className="flex h-[88vh] w-full max-w-6xl animate-rise-in flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-deck">
                <header className="flex shrink-0 flex-col gap-4 border-b border-brand-steel/10 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-sky text-brand-steel">
                            <PreviewIcon className="h-5 w-5" aria-hidden="true" />
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
                    <PreviewTabButton active={tab === "preview"} onClick={() => onTabChange("preview")}>
                        Preview
                    </PreviewTabButton>
                    <PreviewTabButton active={tab === "detail"} onClick={() => onTabChange("detail")}>
                        Detail
                    </PreviewTabButton>
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
                        <FileDetailPanel
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
