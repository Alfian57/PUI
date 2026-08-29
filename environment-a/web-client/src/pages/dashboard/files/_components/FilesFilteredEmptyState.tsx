import { FileText } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/Button";

type FilesFilteredEmptyStateProps = {
    onClearFilter: () => void;
};

export function FilesFilteredEmptyState({ onClearFilter }: FilesFilteredEmptyStateProps): JSX.Element {
    return (
        <section className="rounded-[1.75rem] border border-dashed border-brand-steel/20 bg-brand-sky/45">
            <EmptyState
                icon={<FileText className="h-7 w-7" aria-hidden="true" />}
                title="Tidak ada item pada rentang waktu ini"
                description="Ubah filter waktu untuk menampilkan item lain di lokasi ini."
                action={(
                    <Button variant="secondary" onClick={onClearFilter}>
                        Tampilkan semua waktu
                    </Button>
                )}
            />
        </section>
    );
}
