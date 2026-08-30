import { useCallback, useState } from "react";
import { generatePath, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Database, FileText, Folder, FolderTree, RotateCcw, StarOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatBytes, formatCount, formatDate } from "@/shared/lib/format";
import type { DirectoryDetailScope } from "@/shared/types/directories";
import { useDirectoryDetail } from "@/pages/dashboard/_hooks/useDirectoryDetail";
import { useDashboardWorkspace } from "@/widgets/dashboard/hooks/useDashboardWorkspace";
import { WorkspaceItemsView } from "@/widgets/dashboard/components/WorkspaceItemsView";
import { ROUTES } from "@/app/routes";

type FolderDetailPageProps = {
    scope: DirectoryDetailScope;
};

const scopeContent: Record<DirectoryDetailScope, {
    title: string;
    description: string;
    backLabel: string;
    unavailableTitle: string;
    unavailableDescription: string;
}> = {
    starred: {
        title: "Detail direktori berbintang",
        description: "Informasi dan isi direktori yang Anda tandai berbintang.",
        backLabel: "Kembali ke Berbintang",
        unavailableTitle: "Direktori tidak lagi berbintang",
        unavailableDescription: "Direktori ini mungkin sudah dihapus dari daftar Berbintang atau tidak lagi tersedia."
    },
    trash: {
        title: "Detail direktori di Sampah",
        description: "Informasi dan isi direktori yang berada di Sampah.",
        backLabel: "Kembali ke Sampah",
        unavailableTitle: "Direktori tidak tersedia di Sampah",
        unavailableDescription: "Direktori ini mungkin sudah dipulihkan atau dihapus permanen."
    }
};

function getSourceRoute(scope: DirectoryDetailScope): string {
    return scope === "starred" ? ROUTES.app.starred : ROUTES.app.trash;
}

export function FolderDetailPage({ scope }: FolderDetailPageProps): JSX.Element {
    const navigate = useNavigate();
    const { folderID } = useParams<{ folderID: string }>();
    const { directory, summary, directories, files, isLoading, isError } = useDirectoryDetail(folderID, scope);
    const {
        viewMode,
        onSelectFile,
        onDownload,
        onSoftDelete,
        onSoftDeleteFolder,
        onToggleFileStarred,
        onToggleFolderStarred,
        onRestoreFile,
        onRestoreFolder,
        onPermanentDeleteFile,
        onPermanentDeleteFolder
    } = useDashboardWorkspace();
    const [actionPending, setActionPending] = useState(false);
    const content = scopeContent[scope];
    const sourceRoute = getSourceRoute(scope);

    const handleOpenFolder = useCallback((directoryID: string) => {
        const route = scope === "starred" ? ROUTES.app.starredFolderDetail : ROUTES.app.trashFolderDetail;
        navigate(generatePath(route, { folderID: directoryID }));
    }, [navigate, scope]);

    function goBack(): void {
        navigate(sourceRoute);
    }

    async function runAction(action: () => Promise<boolean>): Promise<void> {
        if (!directory || actionPending) {
            return;
        }

        setActionPending(true);
        try {
            if (await action()) {
                navigate(sourceRoute, { replace: true });
            }
        } finally {
            setActionPending(false);
        }
    }

    if (isLoading) {
        return (
            <section className="rounded-[1.75rem] bg-white p-5 shadow-soft ring-1 ring-brand-line/70 sm:p-6">
                <div className="h-8 w-48 animate-pulse rounded-xl bg-brand-sky" />
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    {[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-brand-sky/70" />)}
                </div>
            </section>
        );
    }

    if (isError || !directory || !summary) {
        return (
            <section className="rounded-[1.75rem] bg-white p-5 shadow-soft ring-1 ring-brand-line/70 sm:p-6">
                <EmptyState
                    icon={<Folder className="h-7 w-7" aria-hidden="true" />}
                    title={content.unavailableTitle}
                    description={content.unavailableDescription}
                    action={(
                        <Button variant="secondary" icon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />} onClick={goBack}>
                            {content.backLabel}
                        </Button>
                    )}
                />
            </section>
        );
    }

    return (
        <div className="space-y-4">
            <section className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <Button
                        variant="ghost"
                        icon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
                        onClick={goBack}
                        className="-ml-3 h-9 px-3 text-xs"
                    >
                        {content.backLabel}
                    </Button>
                    <h1 className="mt-2 font-display text-2xl font-semibold leading-tight text-brand-logoBlue sm:text-3xl">{content.title}</h1>
                    <p className="mt-1 text-sm text-brand-steel">{content.description}</p>
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-brand-line/70">
                <div className="flex flex-col gap-3 border-b border-brand-steel/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-logoYellow/15 text-brand-logoYellow">
                            <Folder className="h-8 w-8" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                            <p className="truncate font-display text-xl font-semibold text-brand-logoBlue">{directory.name}</p>
                            <p className="mt-0.5 text-xs text-brand-steel">Lokasi: {scope === "starred" ? "Berbintang" : "Sampah"}</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                        {scope === "starred" ? (
                            <Button
                                variant="secondary"
                                icon={<StarOff className="h-4 w-4" aria-hidden="true" />}
                                disabled={actionPending}
                                onClick={() => void runAction(() => onToggleFolderStarred(directory.id, directory.name, true))}
                                className="h-10 px-3 text-xs sm:h-9"
                            >
                                Hapus bintang
                            </Button>
                        ) : (
                            <>
                                <Button
                                    variant="secondary"
                                    icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
                                    disabled={actionPending}
                                    onClick={() => void runAction(() => onRestoreFolder(directory.id, directory.name))}
                                    className="h-10 px-3 text-xs sm:h-9"
                                >
                                    Pulihkan
                                </Button>
                                <Button
                                    variant="danger"
                                    icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                                    disabled={actionPending}
                                    onClick={() => void runAction(() => onPermanentDeleteFolder(directory.id, directory.name))}
                                    className="h-10 px-3 text-xs sm:h-9"
                                >
                                    Hapus permanen
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                <div className="grid divide-y divide-brand-steel/10 bg-brand-sky/35 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                    <div className="px-4 py-3 sm:p-4">
                        <div className="flex items-center gap-2 text-brand-steel">
                            <FolderTree className="h-4 w-4" aria-hidden="true" />
                            <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">Subfolder</span>
                        </div>
                        <p className="mt-1 text-lg font-semibold text-brand-logoBlue">{formatCount(summary.directory_count, "folder")}</p>
                    </div>
                    <div className="px-4 py-3 sm:p-4">
                        <div className="flex items-center gap-2 text-brand-steel">
                            <FileText className="h-4 w-4" aria-hidden="true" />
                            <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">Berkas</span>
                        </div>
                        <p className="mt-1 text-lg font-semibold text-brand-logoBlue">{formatCount(summary.file_count, "berkas")}</p>
                    </div>
                    <div className="px-4 py-3 sm:p-4">
                        <div className="flex items-center gap-2 text-brand-steel">
                            <Database className="h-4 w-4" aria-hidden="true" />
                            <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">Ukuran</span>
                        </div>
                        <p className="mt-1 text-lg font-semibold text-brand-logoBlue">{formatBytes(summary.total_bytes)}</p>
                    </div>
                </div>

                <dl className="grid gap-3 border-t border-brand-steel/10 p-4 sm:grid-cols-2 sm:p-5">
                    <div>
                        <dt className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-steel">
                            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                            Dibuat
                        </dt>
                        <dd className="mt-0.5 text-sm font-semibold text-brand-logoBlue">{formatDate(directory.created_at)}</dd>
                    </div>
                    {scope === "starred" ? (
                        <div>
                            <dt className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-steel">
                                <StarOff className="h-3.5 w-3.5" aria-hidden="true" />
                                Ditandai berbintang
                            </dt>
                            <dd className="mt-0.5 text-sm font-semibold text-brand-logoBlue">{directory.starred_at ? formatDate(directory.starred_at) : "-"}</dd>
                        </div>
                    ) : (
                        <div>
                            <dt className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-steel">
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                Dipindahkan ke Sampah
                            </dt>
                            <dd className="mt-0.5 text-sm font-semibold text-brand-logoBlue">{directory.deleted_at ? formatDate(directory.deleted_at) : "-"}</dd>
                        </div>
                    )}
                </dl>
            </section>

            <section className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-brand-line/70 sm:p-5">
                <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h2 className="font-display text-xl font-semibold text-brand-logoBlue">Isi direktori</h2>
                        <p className="mt-1 text-sm text-brand-steel">Subfolder dan berkas langsung pada direktori ini.</p>
                    </div>
                    <p className="text-sm font-semibold text-brand-steel">
                        {directories.length + files.length} item
                    </p>
                </div>
                {directories.length > 0 || files.length > 0 ? (
                    <WorkspaceItemsView
                        folders={directories}
                        files={files}
                        selectedFileID={null}
                        loading={false}
                        viewMode={viewMode}
                        onOpenFolder={handleOpenFolder}
                        onSelectFile={onSelectFile}
                        onDownload={onDownload}
                        onSoftDelete={onSoftDelete}
                        onSoftDeleteFolder={onSoftDeleteFolder}
                        onToggleFileStarred={onToggleFileStarred}
                        onToggleFolderStarred={onToggleFolderStarred}
                        onRestoreFile={onRestoreFile}
                        onRestoreFolder={onRestoreFolder}
                        onPermanentDeleteFile={onPermanentDeleteFile}
                        onPermanentDeleteFolder={onPermanentDeleteFolder}
                        mode={scope === "trash" ? "trash" : "normal"}
                    />
                ) : (
                    <div className="rounded-2xl bg-brand-sky/60 px-4 py-8 text-center">
                        <Folder className="mx-auto h-8 w-8 text-brand-logoYellow" aria-hidden="true" />
                        <p className="mt-3 font-semibold text-brand-logoBlue">Direktori ini kosong</p>
                        <p className="mt-1 text-sm text-brand-steel">Belum ada subfolder atau berkas langsung di dalamnya.</p>
                    </div>
                )}
            </section>
        </div>
    );
}
