import type { ChangeEvent, RefObject } from "react";
import { FileText, FolderOpen } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/Button";

type FilesLocationEmptyStateProps = {
    selectedDirectoryID: string | null;
    inputRef: RefObject<HTMLInputElement>;
    onCreateFolder: () => void;
    onUpload: (file: File) => Promise<void>;
};

export function FilesLocationEmptyState({
    selectedDirectoryID,
    inputRef,
    onCreateFolder,
    onUpload
}: FilesLocationEmptyStateProps): JSX.Element {
    async function handleUploadChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
        const file = event.target.files?.[0];
        if (file) {
            await onUpload(file);
        }
        event.target.value = "";
    }

    return (
        <section className="rounded-[1.75rem] border border-dashed border-brand-steel/20 bg-brand-sky/45">
            <input
                ref={inputRef}
                type="file"
                className="hidden"
                onChange={(event) => void handleUploadChange(event)}
            />
            <EmptyState
                icon={<FolderOpen className="h-7 w-7" aria-hidden="true" />}
                title={selectedDirectoryID ? "Direktori ini masih kosong" : "Berkas Saya masih kosong"}
                description="Buat direktori baru atau unggah berkas pertama ke lokasi ini."
                action={(
                    <div className="flex flex-wrap justify-center gap-2">
                        <Button onClick={onCreateFolder}>Buat direktori</Button>
                        <Button
                            variant="secondary"
                            icon={<FileText className="h-4 w-4" aria-hidden="true" />}
                            onClick={() => inputRef.current?.click()}
                        >
                            Unggah berkas
                        </Button>
                    </div>
                )}
            />
        </section>
    );
}
