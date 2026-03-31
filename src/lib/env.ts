const fallbackBasePath = "/roistat-dashboard-tg/";

export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL?.trim() ?? "",
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "",
  basePath: import.meta.env.VITE_APP_BASE_PATH?.trim() ?? fallbackBasePath,
  demoMode: import.meta.env.VITE_DEMO_MODE === "true",
  accessPassword: import.meta.env.VITE_ACCESS_PASSWORD?.trim() ?? "",
  roistatApiKey: import.meta.env.VITE_ROISTAT_API_KEY?.trim() ?? "",
  roistatProject: import.meta.env.VITE_ROISTAT_PROJECT?.trim() ?? "",
};

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);
