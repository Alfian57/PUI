import { AlertCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { FileRecord } from "@/shared/types/files";

type PreviewFallbackProps = {
    title: string;
    description: string;
    file?: FileRecord;
    onDownload?: (file: FileRecord) => Promise<void>;
};

export function PreviewFallback({ title, description, file, onDownload }: PreviewFallbackProps): JSX.Element {
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
