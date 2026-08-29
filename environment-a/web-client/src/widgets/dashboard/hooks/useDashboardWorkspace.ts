import { useOutletContext } from "react-router-dom";
import type { DashboardWorkspaceContext } from "@/widgets/dashboard/types/dashboardWorkspace";

export function useDashboardWorkspace(): DashboardWorkspaceContext {
    return useOutletContext<DashboardWorkspaceContext>();
}
