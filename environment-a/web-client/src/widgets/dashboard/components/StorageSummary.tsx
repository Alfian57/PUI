import { Database, FileArchive, FolderOpen, TrendingUp } from "lucide-react";
import { formatBytes, formatCount } from "@/shared/lib/format";
import { SummaryItem } from "./_components/SummaryItem";

type StorageSummaryProps = {
    totalFiles: number;
    totalBytes: number;
    dedup: string;
    folderCount: number;
};

export function StorageSummary({ totalFiles, totalBytes, dedup, folderCount }: StorageSummaryProps): JSX.Element {
    return (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryItem
                label="Berkas"
                value={formatCount(totalFiles, "berkas")}
                icon={<FileArchive className="h-5 w-5" aria-hidden="true" />}
            />
            <SummaryItem
                label="Direktori"
                value={formatCount(folderCount, "direktori")}
                icon={<FolderOpen className="h-5 w-5" aria-hidden="true" />}
            />
            <SummaryItem
                label="Ukuran"
                value={formatBytes(totalBytes)}
                icon={<Database className="h-5 w-5" aria-hidden="true" />}
            />
            <SummaryItem
                label="Efisiensi"
                value={dedup}
                icon={<TrendingUp className="h-5 w-5" aria-hidden="true" />}
            />
        </section>
    );
}
