import { createBrowserRouter } from "react-router-dom";
import { env } from "@/lib/env";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { LoginPage } from "@/features/auth/LoginPage";
import { AuthCallbackPage } from "@/features/auth/AuthCallbackPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { AdminUsersPage } from "@/features/admin/AdminUsersPage";

export const router = createBrowserRouter(
  [
    {
      path: "/login",
      element: <LoginPage />,
    },
    {
      path: "/auth/callback",
      element: <AuthCallbackPage />,
    },
    {
      element: <ProtectedRoute />,
      children: [
        {
          path: "/",
          element: <DashboardPage />,
        },
        {
          path: "/dashboard",
          element: <DashboardPage />,
        },
        {
          path: "/admin/users",
          element: <AdminUsersPage />,
        },
      ],
    },
  ],
  {
    basename: env.basePath,
  },
);
