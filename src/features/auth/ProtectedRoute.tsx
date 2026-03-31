import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";

export function ProtectedRoute() {
  const location = useLocation();
  const { initialized, session, isDemoMode, isPasswordAuthenticated } = useAuth();

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950 text-slate-200">
        Проверяем доступ...
      </div>
    );
  }

  if (!session && !isDemoMode && !isPasswordAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  return <Outlet />;
}
