export const queryKeys = {
  health: ["health"] as const,
  auth: {
    me: (token: string) => ["auth", "me", token] as const
  },
  directories: {
    tree: ["directories", "tree"] as const,
    breadcrumb: (id: string) => ["directories", "breadcrumb", id] as const
  },
  files: {
    byDirectory: (directoryID: string) => ["files", "directory", directoryID] as const,
    detail: (fileID: string) => ["files", "detail", fileID] as const,
    manifest: (fileID: string) => ["files", "manifest", fileID] as const,
    preview: (fileID: string) => ["files", "preview", fileID] as const,
    search: (query: string) => ["files", "search", query] as const
  },
  activity: {
    list: (page: number) => ["activity", "list", page] as const
  },
  insights: {
    user: (range: string) => ["insights", "user", range] as const
  },
  workspace: {
    trash: ["workspace", "trash"] as const,
    starred: ["workspace", "starred"] as const
  },
  admin: {
    analytics: (range: string) => ["admin", "analytics", range] as const,
    system: ["admin", "system"] as const,
    securitySummary: (range: string) => ["admin", "security-summary", range] as const,
    securityEvents: (params: string) => ["admin", "security-events", params] as const
  }
};
