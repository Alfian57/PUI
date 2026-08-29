export type ActivityLog = {
    id: string;
    action: string;
    resource_type: string;
    resource_id?: string | null;
    created_at: string;
};
