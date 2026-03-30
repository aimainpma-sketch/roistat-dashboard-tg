import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import {
  deactivateAdminUser,
  inviteAdminUser,
  listAdminUsers,
  updateAdminUserRole,
} from "@/services/adminRepository";
import type { UserRole } from "@/types/dashboard";

export function useAdminUsers() {
  return useQuery({
    queryKey: queryKeys.adminUsers,
    queryFn: listAdminUsers,
  });
}

export function useAdminActions() {
  const queryClient = useQueryClient();

  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers });

  return {
    invite: useMutation({
      mutationFn: ({ email, role }: { email: string; role: UserRole }) => inviteAdminUser(email, role),
      onSuccess: refresh,
    }),
    changeRole: useMutation({
      mutationFn: ({ userId, role }: { userId: string; role: UserRole }) => updateAdminUserRole(userId, role),
      onSuccess: refresh,
    }),
    toggleStatus: useMutation({
      mutationFn: ({ userId, disabled }: { userId: string; disabled: boolean }) =>
        deactivateAdminUser(userId, disabled),
      onSuccess: refresh,
    }),
  };
}
