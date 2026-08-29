import { useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { CreateFolderModal } from "@/pages/dashboard/_components/CreateFolderModal";
import { useDirectoryTree } from "@/pages/dashboard/_hooks/useDirectoryTree";
import { useFilesWorkspace } from "@/pages/dashboard/_hooks/useFilesWorkspace";
import { useAuth } from "@/pages/auth/_hooks/useAuth";
import { useNoticeCenter } from "@/shared/contexts/useNoticeCenter";
import { useConfirmDialog } from "@/components/shared/useConfirmDialog";
import { DashboardShell } from "@/widgets/dashboard/components/DashboardShell";
import { DashboardSidebar } from "@/widgets/dashboard/components/DashboardSidebar";
import { DashboardTopbar } from "@/widgets/dashboard/components/DashboardTopbar";
import { DashboardUtilityRail } from "@/widgets/dashboard/components/DashboardUtilityRail";
import { DashboardTour } from "@/widgets/dashboard/_components/DashboardTour";
import { useDashboardTour } from "@/widgets/dashboard/hooks/useDashboardTour";
import { useDashboardWorkspaceActions } from "@/widgets/dashboard/hooks/useDashboardWorkspaceActions";
import type { DashboardWorkspaceContext, FileModalTab } from "@/widgets/dashboard/types/dashboardWorkspace";
import type { FileRecord } from "@/shared/types/files";
import { ROUTES } from "@/app/routes";
import { parseEnumQueryParam, useQueryParamState } from "@/shared/hooks/useQueryParamState";

const FILE_MODAL_TAB_OPTIONS = ["preview", "detail"] as const;

export function UserDashboardLayout(): JSX.Element {
    const auth = useAuth();
    const notice = useNoticeCenter();
    const { confirm } = useConfirmDialog();
    const navigate = useNavigate();
    const [createFolderOpen, setCreateFolderOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();
    const [detailsOpen, setDetailsOpen] = useState(false);
    const { value: fileModalTab, setValue: setFileModalTab } = useQueryParamState<FileModalTab>({
        key: "filePreview[tab]",
        defaultValue: "preview",
        parse: parseEnumQueryParam(FILE_MODAL_TAB_OPTIONS, "preview")
    });
    const [viewMode, setViewMode] = useState<"list" | "grid">("list");
    const directories = useDirectoryTree(Boolean(auth.user));
    const files = useFilesWorkspace(Boolean(auth.user), directories.selectedDirectoryID);
    const {
        createFolder: handleCreateFolder,
        onUpload,
        onDownload,
        onSoftDelete,
        onSoftDeleteFolder,
        onToggleFileStarred,
        onToggleFolderStarred,
        onRestoreFile,
        onRestoreFolder,
        onPermanentDeleteFile,
        onPermanentDeleteFolder,
        onBulkSoftDelete,
        onBulkStar,
        onBulkUnstar,
        onBulkRestore,
        onBulkPermanentDelete
    } = useDashboardWorkspaceActions({
        directories,
        files,
        onCreateFolderSuccess: () => setCreateFolderOpen(false)
    });
    const tour = useDashboardTour({
        role: "user",
        navigate,
        pathname: location.pathname,
        setSidebarOpen
    });

    function handleSelectDirectory(directoryID: string | null): void {
        directories.setSelectedDirectoryID(directoryID);
        setSidebarOpen(false);
        navigate(ROUTES.app.files);
    }

    function handleSelectFile(fileID: string): void {
        files.setSelectedFileID(fileID);
        setFileModalTab("preview");
        setDetailsOpen(true);
    }

    function handleSelectSearchResult(file: FileRecord): void {
        directories.setSelectedDirectoryID(file.directory_id ?? null);
        files.setSelectedFileID(file.id);
        setFileModalTab("preview");
        setDetailsOpen(true);
        navigate(ROUTES.app.files);
    }

    async function handleLogout(): Promise<void> {
        const accepted = await confirm({
            title: "Keluar dari HashBox?",
            description: "Sesi aktif akan ditutup dan Anda perlu login kembali untuk membuka berkas.",
            confirmLabel: "Keluar",
            variant: "danger"
        });
        if (!accepted) {
            return;
        }

        await auth.logout();
        notice.show({ variant: "success", message: "Anda berhasil logout." });
        navigate(ROUTES.auth.login, { replace: true });
    }

    const contextValue = useMemo<DashboardWorkspaceContext>(() => ({
        directories,
        files,
        detailsOpen,
        setDetailsOpen,
        fileModalTab,
        setFileModalTab,
        viewMode,
        setViewMode,
        onCreateFolder: () => {
            setCreateFolderOpen(true);
            setSidebarOpen(false);
        },
        onSelectDirectory: handleSelectDirectory,
        onSelectFile: handleSelectFile,
        onDownload,
        onSoftDelete,
        onSoftDeleteFolder,
        onToggleFileStarred,
        onToggleFolderStarred,
        onRestoreFile,
        onRestoreFolder,
        onPermanentDeleteFile,
        onPermanentDeleteFolder,
        onBulkSoftDelete,
        onBulkStar,
        onBulkUnstar,
        onBulkRestore,
        onBulkPermanentDelete,
        onUpload
    }), [
        detailsOpen,
        directories,
        fileModalTab,
        files,
        onBulkPermanentDelete,
        onBulkRestore,
        onBulkSoftDelete,
        onBulkStar,
        onBulkUnstar,
        onDownload,
        onPermanentDeleteFile,
        onPermanentDeleteFolder,
        onRestoreFile,
        onRestoreFolder,
        onSoftDelete,
        onSoftDeleteFolder,
        onToggleFileStarred,
        onToggleFolderStarred,
        onUpload,
        viewMode
    ]);

    if (!auth.user) {
        return <div />;
    }

    return (
        <>
            {tour.running ? (
                <DashboardTour
                    run={tour.running}
                    stepIndex={tour.stepIndex}
                    steps={tour.steps}
                    onEvent={tour.onEvent}
                />
            ) : null}
            <DashboardShell
                sidebarOpen={sidebarOpen}
                onSidebarClose={() => setSidebarOpen(false)}
                sidebar={
                    <DashboardSidebar
                        role="user"
                        onClose={() => setSidebarOpen(false)}
                    />
                }
                topbar={
                    <DashboardTopbar
                        user={auth.user}
                        onSelectFile={handleSelectSearchResult}
                        onMenuClick={() => setSidebarOpen(true)}
                        onLogout={() => void handleLogout()}
                    />
                }
            >
                <Outlet context={contextValue} />
                <DashboardUtilityRail user={auth.user} onStartTour={tour.start} />
            </DashboardShell>

            <CreateFolderModal
                open={createFolderOpen}
                loading={directories.createFolderState.isPending}
                directories={directories.directories}
                defaultParentID={directories.selectedDirectoryID}
                onClose={() => setCreateFolderOpen(false)}
                onCreate={handleCreateFolder}
            />
        </>
    );
}
