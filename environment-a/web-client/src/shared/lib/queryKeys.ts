export const queryKeys = {
  health: ["health"] as const,
  auth: {
    me: (token: string) => ["auth", "me", token] as const
  },
  directories: {
    tree: ["directories", "tree"] as const
  },
  files: {
    byDirectory: (directoryID: string) => ["files", "directory", directoryID] as const,
    detail: (fileID: string) => ["files", "detail", fileID] as const
  }
};
