import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { env, isSupabaseConfigured } from "@/lib/env";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/types/dashboard";

type AuthContextValue = {
  initialized: boolean;
  session: Session | null;
  user: User | null;
  role: UserRole;
  signInWithMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  enterDemoMode: () => void;
  isDemoMode: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const demoSessionKey = "roistat-dashboard.demo-session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [role] = useState<UserRole>("admin");
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      const hasDemoSession = window.localStorage.getItem(demoSessionKey) === "true" || env.demoMode;
      setIsDemoMode(hasDemoSession);
      setInitialized(true);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setInitialized(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      initialized,
      session,
      user: session?.user ?? null,
      role,
      isDemoMode,
      async signInWithMagicLink(email) {
        if (!supabase) {
          throw new Error("Supabase не настроен. Добавьте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY.");
        }

        const callbackUrl = `${window.location.origin}${env.basePath}auth/callback`;
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: callbackUrl,
          },
        });

        if (error) {
          throw error;
        }
      },
      async signOut() {
        if (supabase) {
          await supabase.auth.signOut();
        }

        window.localStorage.removeItem(demoSessionKey);
        setIsDemoMode(false);
      },
      enterDemoMode() {
        window.localStorage.setItem(demoSessionKey, "true");
        setIsDemoMode(true);
      },
    }),
    [initialized, isDemoMode, role, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
