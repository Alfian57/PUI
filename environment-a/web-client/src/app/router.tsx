import { createBrowserRouter, Navigate } from "react-router-dom";
import { RequireAuth } from "@/app/routes/_components/RequireAuth";
import { PublicOnly } from "@/app/routes/_components/PublicOnly";
import { RequireRole } from "@/app/routes/_components/RequireRole";
import { RoleIndexRedirect } from "@/app/routes/_components/RoleIndexRedirect";
import { LandingPage } from "@/pages/landing/page";
import { ForgotPasswordPage } from "@/pages/auth/forgot-password/page";
import { LoginPage } from "@/pages/auth/login/page";
import { RegisterPage } from "@/pages/auth/register/page";
import { ResetPasswordPage } from "@/pages/auth/reset-password/page";
import { DashboardLayout } from "@/widgets/dashboard/DashboardLayout";
import { FilesPage } from "@/pages/dashboard/files/page";
import { ActivityPage } from "@/pages/dashboard/activity/page";
import { InsightPage } from "@/pages/dashboard/insights/page";
import { ProfilePage } from "@/pages/dashboard/profile/page";
import { StarredPage } from "@/pages/dashboard/starred/page";
import { TrashPage } from "@/pages/dashboard/trash/page";
import { FolderDetailPage } from "@/pages/dashboard/folder-detail/page";
import { SecurityLabPage } from "@/pages/dashboard/security-lab/page";
import { AdminSecurityMonitoringPage } from "@/pages/dashboard/admin/security-monitoring/page";
import { env } from "@/shared/config/env";
import { AdminAnalyticsPage } from "@/pages/dashboard/admin/analytics/page";
import { AdminActivityAnalyticsPage } from "@/pages/dashboard/admin/analytics/activity/page";
import { AdminReportsPage } from "@/pages/dashboard/admin/analytics/reports/page";
import { AdminStoragePage } from "@/pages/dashboard/admin/analytics/storage/page";
import { AdminSystemPage } from "@/pages/dashboard/admin/analytics/system/page";
import { ROUTES, ROUTE_SEGMENTS } from "@/app/routes";

export const router = createBrowserRouter([
    {
        path: ROUTES.home,
        element: <LandingPage />
    },
    {
        element: <PublicOnly />,
        children: [
            {
                path: ROUTES.auth.login,
                element: <LoginPage />
            },
            {
                path: ROUTES.auth.register,
                element: <RegisterPage />
            },
            {
                path: ROUTES.auth.forgotPassword,
                element: <ForgotPasswordPage />
            },
            {
                path: ROUTES.auth.resetPassword,
                element: <ResetPasswordPage />
            }
        ]
    },
    {
        element: <RequireAuth />,
        children: [
            {
                path: ROUTES.app.root,
                element: <DashboardLayout />,
                children: [
                    {
                        index: true,
                        element: <RoleIndexRedirect />
                    },
                    {
                        path: ROUTE_SEGMENTS.app.files,
                        element: <RequireRole role="user"><FilesPage /></RequireRole>
                    },
                    {
                        path: ROUTE_SEGMENTS.app.starred,
                        element: <RequireRole role="user"><StarredPage /></RequireRole>
                    },
                    {
                        path: ROUTE_SEGMENTS.app.starredFolderDetail,
                        element: <RequireRole role="user"><FolderDetailPage scope="starred" /></RequireRole>
                    },
                    {
                        path: ROUTE_SEGMENTS.app.trash,
                        element: <RequireRole role="user"><TrashPage /></RequireRole>
                    },
                    {
                        path: ROUTE_SEGMENTS.app.trashFolderDetail,
                        element: <RequireRole role="user"><FolderDetailPage scope="trash" /></RequireRole>
                    },
                    {
                        path: ROUTE_SEGMENTS.app.activity,
                        element: <RequireRole role="user"><ActivityPage /></RequireRole>
                    },
                    {
                        path: ROUTE_SEGMENTS.app.insights,
                        element: <RequireRole role="user"><InsightPage /></RequireRole>
                    },
                    ...(env.securityLabEnabled
                        ? [
                              {
                                  path: ROUTE_SEGMENTS.app.securityLab,
                                  element: (
                                      <RequireRole role="user">
                                          <SecurityLabPage />
                                      </RequireRole>
                                  )
                              }
                          ]
                        : []),
                    {
                        path: ROUTE_SEGMENTS.app.analytics.root,
                        element: <RequireRole role="admin"><Navigate to={ROUTES.app.analytics.overview} replace /></RequireRole>
                    },
                    {
                        path: `${ROUTE_SEGMENTS.app.analytics.root}/${ROUTE_SEGMENTS.app.analytics.overview}`,
                        element: <RequireRole role="admin"><AdminAnalyticsPage /></RequireRole>
                    },
                    {
                        path: `${ROUTE_SEGMENTS.app.analytics.root}/${ROUTE_SEGMENTS.app.analytics.storage}`,
                        element: <RequireRole role="admin"><AdminStoragePage /></RequireRole>
                    },
                    {
                        path: `${ROUTE_SEGMENTS.app.analytics.root}/${ROUTE_SEGMENTS.app.analytics.activity}`,
                        element: <RequireRole role="admin"><AdminActivityAnalyticsPage /></RequireRole>
                    },
                    {
                        path: `${ROUTE_SEGMENTS.app.analytics.root}/${ROUTE_SEGMENTS.app.analytics.system}`,
                        element: <RequireRole role="admin"><AdminSystemPage /></RequireRole>
                    },
                    {
                        path: `${ROUTE_SEGMENTS.app.analytics.root}/${ROUTE_SEGMENTS.app.analytics.security}`,
                        element: <RequireRole role="admin"><AdminSecurityMonitoringPage /></RequireRole>
                    },
                    {
                        path: `${ROUTE_SEGMENTS.app.analytics.root}/${ROUTE_SEGMENTS.app.analytics.reports}`,
                        element: <RequireRole role="admin"><AdminReportsPage /></RequireRole>
                    },
                    {
                        path: ROUTE_SEGMENTS.app.profile,
                        element: <ProfilePage />
                    }
                ]
            }
        ]
    },
    {
        path: ROUTE_SEGMENTS.fallback,
        element: <Navigate to={ROUTES.app.files} replace />
    }
]);
