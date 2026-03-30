import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "./cors.ts";

export type UserRole = "admin" | "editor" | "viewer";

export function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

export function handleOptions(method: string) {
  if (method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  return null;
}

export async function requireRole(request: Request, allowedRoles: UserRole[] = ["admin"]) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = request.headers.get("Authorization");

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey || !authHeader) {
    throw new Error("Missing function environment or authorization header");
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    throw new Error("Unauthorized");
  }

  const { data: roleRecord, error: roleError } = await adminClient
    .schema("app")
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (roleError) {
    throw roleError;
  }

  const role = (roleRecord?.role ?? "viewer") as UserRole;
  if (!allowedRoles.includes(role)) {
    throw new Error("Forbidden");
  }

  return {
    user,
    role,
    adminClient,
  };
}
