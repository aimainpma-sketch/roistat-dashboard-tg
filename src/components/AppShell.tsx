import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { LayoutDashboard, LogOut, Settings2, Shield } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/dashboard";

export function AppShell({
  children,
  title,
  subtitle,
  role,
  actions,
}: {
  children: ReactNode;
  title: string;
  subtitle: string;
  role: UserRole;
  actions?: ReactNode;
}) {
  const { signOut, user, isDemoMode } = useAuth();

  return (
    <div className="min-h-screen bg-ink-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 px-5 py-5 lg:px-8">
        <aside className="glass hidden w-72 shrink-0 rounded-[32px] border border-white/10 p-6 lg:flex lg:flex-col">
          <Link
            className="rounded-3xl border border-white/8 bg-white/5 px-5 py-4"
            to="/dashboard"
          >
            <div className="text-xs uppercase tracking-[0.26em] text-slate-400">Roistat</div>
            <div className="mt-2 font-display text-2xl font-semibold text-white">Marketing Ops</div>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Дневные и недельные отчёты, дерево каналов и управляемая валовая маржа.
            </p>
          </Link>

          <nav className="mt-8 space-y-2">
            <NavItem
              to="/dashboard"
              label="Дашборд"
              icon={<LayoutDashboard className="size-4" />}
            />
            {role === "admin" ? (
              <NavItem
                to="/admin/users"
                label="Пользователи"
                icon={<Shield className="size-4" />}
              />
            ) : null}
          </nav>

          <div className="mt-auto rounded-3xl border border-white/8 bg-white/5 p-4">
            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">
              {isDemoMode ? "Demo access" : "Signed in"}
            </div>
            <div className="mt-2 text-sm font-medium text-white">{user?.email ?? "demo@roistat.local"}</div>
            <div className="mt-1 text-sm text-slate-400">Роль: {role}</div>
            <button
              className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-brand-400/40 hover:text-white"
              onClick={() => void signOut()}
              type="button"
            >
              <LogOut className="size-4" />
              Выйти
            </button>
          </div>
        </aside>

        <main className="flex min-h-[calc(100vh-40px)] min-w-0 flex-1 flex-col rounded-[36px] border border-white/8 bg-white/[0.03] px-4 py-4 shadow-[0_28px_80px_rgba(0,0,0,0.4)] lg:px-6 lg:py-6">
          <header className="glass flex flex-col gap-4 rounded-[28px] border border-white/10 px-5 py-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-brand-400/20 bg-brand-400/8 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-brand-300">
                <Settings2 className="size-3.5" />
                Roistat x Supabase
              </div>
              <h1 className="font-display text-3xl font-semibold text-white">{title}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{subtitle}</p>
            </div>
            {actions ? <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
          </header>

          <div className="mt-6 min-h-0 flex-1">{children}</div>
        </main>
      </div>
    </div>
  );
}

function NavItem({ to, label, icon }: { to: string; label: string; icon: ReactNode }) {
  return (
    <NavLink
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition",
          isActive ? "bg-white/12 text-white" : "text-slate-400 hover:bg-white/6 hover:text-slate-200",
        )
      }
      to={to}
    >
      {icon}
      {label}
    </NavLink>
  );
}
