import { ChevronRight, Home } from "lucide-react";
import type { DirectoryRecord } from "@/shared/types/directories";

type BreadcrumbProps = {
    directoryID: string | null;
    directories: DirectoryRecord[];
    onNavigate: (directoryID: string | null) => void;
};

function buildPath(directories: DirectoryRecord[], directoryID: string | null): DirectoryRecord[] {
    if (!directoryID) {
        return [];
    }

    const directoriesByID = new Map(directories.map((directory) => [directory.id, directory]));
    const path: DirectoryRecord[] = [];
    const visited = new Set<string>();
    let currentID: string | null = directoryID;

    while (currentID && !visited.has(currentID)) {
        visited.add(currentID);
        const directory = directoriesByID.get(currentID);
        if (!directory) {
            return [];
        }

        path.unshift(directory);
        currentID = directory.parent_id ?? null;
    }

    return path;
}

export function Breadcrumb({ directoryID, directories, onNavigate }: BreadcrumbProps): JSX.Element {
    const pathItems = buildPath(directories, directoryID);

    return (
        <nav className="flex min-w-0 items-center gap-1 overflow-x-auto text-sm text-brand-steel" aria-label="Lokasi direktori">
            <button
                type="button"
                onClick={() => onNavigate(null)}
                className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-brand-steel/15 bg-white px-3 py-2 font-semibold text-brand-ink shadow-soft transition hover:border-brand-amber/45 hover:bg-brand-sky focus:outline-none focus:ring-2 focus:ring-brand-amber/40"
            >
                <Home className="h-4 w-4" aria-hidden="true" />
                Berkas Saya
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
