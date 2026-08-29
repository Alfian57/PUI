import type { WorkspaceInteractionHandlers, WorkspaceItem, WorkspaceMode } from "../_types/workspace";
import { WorkspaceFileCard } from "./WorkspaceFileCard";
import { WorkspaceFolderCard } from "./WorkspaceFolderCard";

type WorkspaceGridProps = WorkspaceInteractionHandlers & {
    items: WorkspaceItem[];
    selectedFileID: string | null;
    mode: WorkspaceMode;
    isSelected: (item: WorkspaceItem) => boolean;
    onToggleSelected: (item: WorkspaceItem) => void;
};

export function WorkspaceGrid({
    items,
    selectedFileID,
    mode,
    isSelected,
    onToggleSelected,
    ...handlers
}: WorkspaceGridProps): JSX.Element {
    return (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            {items.map((item) => item.kind === "folder" ? (
                <WorkspaceFolderCard
                    key={`folder-${item.folder.id}`}
                    folder={item.folder}
                    mode={mode}
                    selected={isSelected(item)}
                    onToggleSelected={() => onToggleSelected(item)}
                    {...handlers}
                />
            ) : (
                <WorkspaceFileCard
                    key={`file-${item.file.id}`}
                    file={item.file}
                    mode={mode}
                    selected={isSelected(item)}
                    selectedFileID={selectedFileID}
                    onToggleSelected={() => onToggleSelected(item)}
                    {...handlers}
                />
            ))}
        </section>
    );
}
