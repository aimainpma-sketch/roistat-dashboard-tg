import { handleOptions, jsonResponse, requireRole } from "../_shared/auth.ts";

Deno.serve(async (request) => {
  const optionsResponse = handleOptions(request.method);
  if (optionsResponse) {
    return optionsResponse;
  }

  try {
    const payload = await request.json();
    const { adminClient } = await requireRole(request, ["admin"]);
    const redirectTo = Deno.env.get("APP_AUTH_CALLBACK_URL");

    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(payload.email, {
      redirectTo,
      data: {
        invited_role: payload.role,
      },
    });

    if (error || !data.user) {
      throw error ?? new Error("Invite failed");
    }

    const { error: roleError } = await adminClient
      .schema("app")
      .from("user_roles")
      .upsert({ user_id: data.user.id, role: payload.role }, { onConflict: "user_id" });

    if (roleError) {
      throw roleError;
    }

    return jsonResponse({ ok: true, userId: data.user.id });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unexpected error" }, 400);
  }
});
