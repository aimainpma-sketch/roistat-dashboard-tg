import { handleOptions, jsonResponse, requireRole } from "../_shared/auth.ts";

Deno.serve(async (request) => {
  const optionsResponse = handleOptions(request.method);
  if (optionsResponse) {
    return optionsResponse;
  }

  try {
    const { adminClient } = await requireRole(request, ["admin"]);
    const { data, error } = await adminClient.auth.admin.listUsers();
    if (error) {
      throw error;
    }

    const userIds = data.users.map((user) => user.id);
    const { data: roles } = await adminClient
      .schema("app")
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", userIds);

    const roleMap = new Map(roles?.map((item) => [item.user_id, item.role]) ?? []);

    return jsonResponse({
      users: data.users.map((user) => ({
        id: user.id,
        email: user.email,
        role: roleMap.get(user.id) ?? "viewer",
        status: user.banned_until ? "disabled" : user.last_sign_in_at ? "active" : "invited",
        invitedAt: user.created_at,
      })),
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unexpected error" }, 400);
  }
});
