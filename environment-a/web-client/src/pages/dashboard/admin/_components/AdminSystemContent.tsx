import { Database, HardDrive, Server, UploadCloud } from "lucide-react";
import type { AdminSystemStatus } from "@/shared/types/admin";
import { formatBytes, formatDate } from "@/shared/lib/format";
import { MetricCard } from "@/pages/dashboard/admin/_components/MetricCard";
import { statusLabel, statusTone } from "@/pages/dashboard/admin/_lib/analytics";

export function AdminSystemContent({ system }: { system: AdminSystemStatus }): JSX.Element {
    return (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Aplikasi" value={statusLabel(system.status)} valueClassName={statusTone(system.status)} helper={`Diperiksa ${formatDate(system.checked_at)}`} icon={<Server className="h-5 w-5" />} />
            <MetricCard label="Database" value={statusLabel(system.database)} valueClassName={statusTone(system.database)} helper="Metadata dan sesi pengguna" icon={<Database className="h-5 w-5" />} />
            <MetricCard label="Vault Core" value={statusLabel(system.vault_core)} valueClassName={statusTone(system.vault_core)} helper="Penyimpanan immutable" icon={<HardDrive className="h-5 w-5" />} />
            <MetricCard label="Batas unggah" value={formatBytes(system.max_upload_size_bytes)} helper={`${system.rate_limit_per_minute} permintaan per menit`} icon={<UploadCloud className="h-5 w-5" />} />
        </section>
    );
}
