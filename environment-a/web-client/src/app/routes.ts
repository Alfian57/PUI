export const ROUTES = {
    home: "/",
    auth: {
        login: "/login",
        register: "/register",
        forgotPassword: "/forgot-password",
        resetPassword: "/reset-password"
    },
    app: {
        root: "/app",
        files: "/app/files",
        starred: "/app/starred",
        starredFolderDetail: "/app/starred/folders/:folderID",
        trash: "/app/trash",
        trashFolderDetail: "/app/trash/folders/:folderID",
        activity: "/app/activity",
        insights: "/app/insights",
        securityLab: "/app/security-lab",
        analytics: {
            root: "/app/analytics",
            overview: "/app/analytics/overview",
            storage: "/app/analytics/storage",
            activity: "/app/analytics/activity",
            system: "/app/analytics/system",
            security: "/app/analytics/security",
            reports: "/app/analytics/reports"
        },
        profile: "/app/profile"
    },
    landing: {
        sections: {
            solution: "#solusi",
            features: "#fitur",
            architecture: "#arsitektur",
            validation: "#validasi",
            faq: "#faq"
        }
    }
} as const;

export const ROUTE_SEGMENTS = {
    fallback: "*",
    auth: {
        login: "login",
        register: "register",
        forgotPassword: "forgot-password",
        resetPassword: "reset-password"
    },
    app: {
        root: "app",
        files: "files",
        starred: "starred",
        starredFolderDetail: "starred/folders/:folderID",
        trash: "trash",
        trashFolderDetail: "trash/folders/:folderID",
        activity: "activity",
        insights: "insights",
        securityLab: "security-lab",
        analytics: {
            root: "analytics",
            overview: "overview",
            storage: "storage",
            activity: "activity",
            system: "system",
            security: "security",
            reports: "reports"
        },
        profile: "profile"
    }
} as const;

export const LANDING_SECTION_IDS = {
    solution: ROUTES.landing.sections.solution.slice(1),
    features: ROUTES.landing.sections.features.slice(1),
    architecture: ROUTES.landing.sections.architecture.slice(1),
    validation: ROUTES.landing.sections.validation.slice(1),
    faq: ROUTES.landing.sections.faq.slice(1)
} as const;
