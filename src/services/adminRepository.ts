import { demoAuthUsers } from "@/data/demo";
import { supabase } from "@/lib/supabase";
import type { AdminUser, UserRole } from "@/types/dashboard";

async function invoke<T>(name: string, body?: Record<string, unknown>) {
  if (!supabase) {
    throw new Error("Supabase не настроен");
  }

  const { data, error } = await supabase.functions.invoke<T>(name, {
    body,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  if (!supabase) {
    return demoAuthUsers;
  }

  const response = await invoke<{ users: AdminUser[] }>("admin-list-users");
  return response?.users ?? [];
}

export async function inviteAdminUser(email: string, role: UserRole) {
  if (!supabase) {
    return;
  }

  await invoke("admin-invite-user", { email, role });
}

export async function updateAdminUserRole(userId: string, role: UserRole) {
  if (!supabase) {
    return;
  }

  await invoke("admin-set-role", { userId, role });
}

export async function deactivateAdminUser(userId: string, disabled: boolean) {
  if (!supabase) {
    return;
  }

  await invoke("admin-deactivate-user", { userId, disabled });
}
