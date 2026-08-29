export type WorkspaceTimeFilter = "all" | "today" | "7d" | "30d" | "month" | "year" | "custom";

export type WorkspaceCustomTimeRange = {
    from: string;
    to: string;
};
