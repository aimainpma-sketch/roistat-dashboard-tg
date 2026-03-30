import { handleOptions, jsonResponse, requireRole } from "../_shared/auth.ts";

Deno.serve(async (request) => {
  const optionsResponse = handleOptions(request.method);
  if (optionsResponse) {
    return optionsResponse;
  }

  try {
    const payload = await request.json();
    const { adminClient } = await requireRole(request, ["admin"]);

    const { error } = await adminClient.auth.admin.updateUserById(payload.userId, {
      ban_duration: payload.disabled ? "876000h" : "none",
    });

    if (error) {
      throw error;
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unexpected error" }, 400);
  }
});
