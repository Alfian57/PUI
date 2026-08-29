import { useDashboardBulkActions } from "@/widgets/dashboard/hooks/useDashboardBulkActions";
import { useDashboardDirectoryActions } from "@/widgets/dashboard/hooks/useDashboardDirectoryActions";
import { useDashboardFileActions } from "@/widgets/dashboard/hooks/useDashboardFileActions";
import type { useDirectoryTree } from "@/pages/dashboard/_hooks/useDirectoryTree";
import type { useFilesWorkspace } from "@/pages/dashboard/_hooks/useFilesWorkspace";
import type { DashboardWorkspaceActionHandlers } from "@/widgets/dashboard/types/dashboardWorkspace";

type DashboardWorkspaceActionDependencies = {
    directories: ReturnType<typeof useDirectoryTree>;
    files: ReturnType<typeof useFilesWorkspace>;
    onCreateFolderSuccess?: () => void;
};

export function useDashboardWorkspaceActions({
    directories,
    files,
    onCreateFolderSuccess
}: DashboardWorkspaceActionDependencies): DashboardWorkspaceActionHandlers {
    const directoryActions = useDashboardDirectoryActions({ directories, onCreateFolderSuccess });
    const fileActions = useDashboardFileActions({ files });
    const bulkActions = useDashboardBulkActions({ directories, files });

    return {
        ...directoryActions,
        ...fileActions,
        ...bulkActions
    };
}
