import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Home } from "lucide-react";
import { getBreadcrumb } from "@/features/directories/api/directoryApi";
import { queryKeys } from "@/shared/lib/queryKeys";

type BreadcrumbProps = {
    directoryID: string | null;
    onNavigate: (directoryID: string | null) => void;
};

export function Breadcrumb({ directoryID, onNavigate }: BreadcrumbProps): JSX.Element | null {
    const { data: items } = useQuery({
        queryKey: queryKeys.directories.breadcrumb(directoryID ?? "none"),
        queryFn: () => getBreadcrumb(directoryID!),
        enabled: Boolean(directoryID)
    });

    const pathItems = items ?? [];

    return (
        <nav className="flex min-w-0 items-center gap-1 overflow-x-auto text-sm text-brand-steel" aria-label="Lokasi folder">
            <button
                type="button"
                onClick={() => onNavigate(null)}
                className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-brand-steel/15 bg-white px-3 py-2 font-semibold text-brand-ink shadow-soft transition hover:border-brand-amber/45 hover:bg-brand-sky focus:outline-none focus:ring-2 focus:ring-brand-amber/40"
            >
                <Home className="h-4 w-4" aria-hidden="true" />
                File Saya
            </button>
            {pathItems.map((item) => (
                <span key={item.id} className="flex shrink-0 items-center gap-1 whitespace-nowrap">
                    <ChevronRight className="h-4 w-4 text-brand-steel/45" aria-hidden="true" />
                    <button
                        type="button"
                        onClick={() => onNavigate(item.id)}
                        className="rounded-2xl px-3 py-2 font-medium text-brand-steel transition hover:bg-brand-sky hover:text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-amber/40"
                    >
                        {item.name}
                    </button>
                </span>
            ))}
        </nav>
    );
}
