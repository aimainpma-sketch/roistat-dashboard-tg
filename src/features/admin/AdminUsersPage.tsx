import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useCurrentRole } from "@/features/dashboard/hooks/useDashboardData";
import { useAdminActions, useAdminUsers } from "@/features/admin/hooks/useAdminUsers";
import type { UserRole } from "@/types/dashboard";

export function AdminUsersPage() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("viewer");
  const usersQuery = useAdminUsers();
  const currentRole = useCurrentRole();
  const actions = useAdminActions();

  return (
    <AppShell
      title="Пользователи и роли"
      subtitle="Минимальная внутренняя админка для invite-only доступа, ролей и деактивации пользователей."
      role={currentRole.data ?? "admin"}
    >
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="glass rounded-[32px] border border-white/10 p-6">
          <div className="text-sm uppercase tracking-[0.24em] text-slate-500">Invite-only</div>
          <h2 className="mt-2 text-2xl font-semibold text-white">Пригласить пользователя</h2>
          <form
            className="mt-6 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void actions.invite.mutateAsync({ email, role }).then(() => setEmail(""));
            }}
          >
            <label className="block">
              <span className="mb-2 block text-sm text-slate-400">Email</span>
              <input
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                onChange={(event) => setEmail(event.target.value)}
                value={email}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-slate-400">Роль</span>
              <select
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                onChange={(event) => setRole(event.target.value as UserRole)}
                value={role}
              >
                <option value="viewer">viewer</option>
                <option value="editor">editor</option>
                <option value="admin">admin</option>
              </select>
            </label>
            <button
              className="rounded-2xl bg-brand-400 px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-brand-500"
              type="submit"
            >
              Отправить инвайт
            </button>
          </form>
        </section>

        <section className="glass rounded-[32px] border border-white/10 p-6">
          <div className="text-sm uppercase tracking-[0.24em] text-slate-500">Admin list</div>
          <h2 className="mt-2 text-2xl font-semibold text-white">Текущие пользователи</h2>
          <div className="mt-6 overflow-hidden rounded-3xl border border-white/8">
            <table className="min-w-full">
              <thead className="bg-white/5">
                <tr>
                  {["Email", "Роль", "Статус", "Действия"].map((label) => (
                    <th
                      key={label}
                      className="px-4 py-3 text-left text-xs uppercase tracking-[0.22em] text-slate-500"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usersQuery.data?.map((user) => (
                  <tr
                    key={user.id}
                    className="border-t border-white/6"
                  >
                    <td className="px-4 py-3 text-sm text-slate-200">{user.email}</td>
                    <td className="px-4 py-3">
                      <select
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
                        onChange={(event) =>
                          void actions.changeRole.mutateAsync({
                            userId: user.id,
                            role: event.target.value as UserRole,
                          })
                        }
                        value={user.role}
                      >
                        <option value="viewer">viewer</option>
                        <option value="editor">editor</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">{user.status}</td>
                    <td className="px-4 py-3">
                      <button
                        className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:border-brand-400/40 hover:text-white"
                        onClick={() =>
                          void actions.toggleStatus.mutateAsync({
                            userId: user.id,
                            disabled: user.status !== "disabled",
                          })
                        }
                        type="button"
                      >
                        {user.status === "disabled" ? "Активировать" : "Отключить"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
