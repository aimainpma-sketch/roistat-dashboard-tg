const fallbackBasePath = "/roistat-dashboard-tg/";

export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL?.trim() ?? "",
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "",
  basePath: import.meta.env.VITE_APP_BASE_PATH?.trim() ?? fallbackBasePath,
  demoMode: import.meta.env.VITE_DEMO_MODE === "true",
};

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);
