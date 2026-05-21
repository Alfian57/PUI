import { createBrowserRouter, Navigate } from "react-router-dom";
import { RequireAuth, PublicOnly, RequireRole, RoleIndexRedirect } from "@/app/routes/AuthGuards";
import { LandingPage } from "@/pages/LandingPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import { DashboardLayout } from "@/widgets/dashboard/DashboardLayout";
import { FilesPage } from "@/pages/dashboard/FilesPage";
import { ActivityPage } from "@/pages/dashboard/ActivityPage";
import { InsightPage } from "@/pages/dashboard/InsightPage";
import { ProfilePage } from "@/pages/dashboard/ProfilePage";
import { StarredPage } from "@/pages/dashboard/StarredPage";
import { TrashPage } from "@/pages/dashboard/TrashPage";
import {
    AdminActivityAnalyticsPage,
    AdminAnalyticsPage,
    AdminReportsPage,
    AdminStoragePage,
    AdminSystemPage
} from "@/pages/dashboard/AdminAnalyticsPage";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <LandingPage />
    },
    {
        element: <PublicOnly />,
        children: [
            {
                path: "/login",
                element: <LoginPage />
            },
            {
                path: "/register",
                element: <RegisterPage />
            },
            {
                path: "/forgot-password",
                element: <ForgotPasswordPage />
            },
            {
                path: "/reset-password",
                element: <ResetPasswordPage />
            }
        ]
    },
    {
        element: <RequireAuth />,
        children: [
            {
                path: "/app",
                element: <DashboardLayout />,
                children: [
                    {
                        index: true,
                        element: <RoleIndexRedirect />
                    },
                    {
                        path: "files",
                        element: <RequireRole role="user"><FilesPage /></RequireRole>
                    },
                    {
                        path: "starred",
                        element: <RequireRole role="user"><StarredPage /></RequireRole>
                    },
                    {
                        path: "trash",
                        element: <RequireRole role="user"><TrashPage /></RequireRole>
                    },
                    {
                        path: "activity",
                        element: <RequireRole role="user"><ActivityPage /></RequireRole>
                    },
                    {
                        path: "insights",
                        element: <RequireRole role="user"><InsightPage /></RequireRole>
                    },
                    {
                        path: "analytics",
                        element: <RequireRole role="admin"><Navigate to="/app/analytics/overview" replace /></RequireRole>
                    },
                    {
                        path: "analytics/overview",
                        element: <RequireRole role="admin"><AdminAnalyticsPage /></RequireRole>
                    },
                    {
                        path: "analytics/storage",
                        element: <RequireRole role="admin"><AdminStoragePage /></RequireRole>
                    },
                    {
                        path: "analytics/activity",
                        element: <RequireRole role="admin"><AdminActivityAnalyticsPage /></RequireRole>
                    },
                    {
                        path: "analytics/system",
                        element: <RequireRole role="admin"><AdminSystemPage /></RequireRole>
                    },
                    {
                        path: "analytics/reports",
                        element: <RequireRole role="admin"><AdminReportsPage /></RequireRole>
                    },
                    {
                        path: "profile",
                        element: <ProfilePage />
                    }
                ]
            }
        ]
    },
    {
        path: "*",
        element: <Navigate to="/app/files" replace />
    }
]);
