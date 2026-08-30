import type { WorkspaceInteractionHandlers, WorkspaceItem, WorkspaceMode } from "../_types/workspace";
import { WorkspaceFileRow } from "./WorkspaceFileRow";
import { WorkspaceFolderRow } from "./WorkspaceFolderRow";

type WorkspaceListProps = WorkspaceInteractionHandlers & {
    items: WorkspaceItem[];
    selectedFileID: string | null;
    mode: WorkspaceMode;
    isSelected: (item: WorkspaceItem) => boolean;
    onToggleSelected: (item: WorkspaceItem) => void;
};

export function WorkspaceList({
    items,
    selectedFileID,
    mode,
    isSelected,
    onToggleSelected,
    ...handlers
}: WorkspaceListProps): JSX.Element {
    return (
        <section className="overflow-hidden border-y border-brand-steel/10 bg-white sm:rounded-[1.5rem] sm:border-0 sm:ring-1 sm:ring-brand-line/70">
            <div className="grid grid-cols-[2.5rem_minmax(0,1.6fr)_8rem_11rem_11rem] border-b border-brand-steel/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-brand-steel max-lg:hidden">
                <span aria-hidden="true" />
                <span>Nama</span>
                <span>Jenis</span>
                <span>Tanggal</span>
                <span>Aksi</span>
            </div>

            <div className="divide-y divide-brand-steel/10">
                {items.map((item) => item.kind === "folder" ? (
                    <WorkspaceFolderRow
                        key={`folder-${item.folder.id}`}
                        folder={item.folder}
                        mode={mode}
                        selected={isSelected(item)}
                        onToggleSelected={() => onToggleSelected(item)}
                        {...handlers}
                    />
                ) : (
                    <WorkspaceFileRow
                        key={`file-${item.file.id}`}
                        file={item.file}
                        mode={mode}
                        selected={isSelected(item)}
                        selectedFileID={selectedFileID}
                        onToggleSelected={() => onToggleSelected(item)}
                        {...handlers}
                    />
                ))}
            </div>
        </section>
    );
}
