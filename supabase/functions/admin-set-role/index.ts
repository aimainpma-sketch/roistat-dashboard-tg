import { handleOptions, jsonResponse, requireRole } from "../_shared/auth.ts";

Deno.serve(async (request) => {
  const optionsResponse = handleOptions(request.method);
  if (optionsResponse) {
    return optionsResponse;
  }

  try {
    const payload = await request.json();
    const { adminClient } = await requireRole(request, ["admin"]);

    const { error } = await adminClient
      .schema("app")
      .from("user_roles")
      .upsert({ user_id: payload.userId, role: payload.role }, { onConflict: "user_id" });

    if (error) {
      throw error;
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unexpected error" }, 400);
  }
});
