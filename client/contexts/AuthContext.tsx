import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

function getBaseUrl(): string {
  const fromEnv = (import.meta as any)?.env?.VITE_APP_URL as string | undefined;
  return fromEnv || window.location.origin;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ Initial session + subscription
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription?.subscription?.unsubscribe();
    };
  }, []);

  // ✅ Handle magic link / recovery tokens in the URL
  useEffect(() => {
    const url = new URL(window.location.href);
    const hash = url.hash?.startsWith("#") ? url.hash.slice(1) : "";

    if (!hash) return;

    const params = new URLSearchParams(hash);
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    const type = params.get("type");
    const error_description = params.get("error_description");

    if (error_description) {
      console.error("Supabase verification error:", decodeURIComponent(error_description));
      window.history.replaceState({}, "", url.origin + url.pathname + url.search);
      return;
    }

    if (access_token && refresh_token) {
      supabase.auth
        .setSession({ access_token, refresh_token })
        .then(({ data, error }) => {
          if (error) {
            console.error("setSession error:", error);
            return;
          }

          setSession(data.session ?? null);
          setUser(data.session?.user ?? null);

          // Clean URL
          window.history.replaceState({}, "", url.origin + url.pathname + url.search);

          if (type === "recovery") {
            window.location.replace("/reset-password");
          } else {
            window.history.replaceState({}, "", "/auth/callback");
          }
        })
        .catch((e) => console.error("setSession exception:", e));
    }
  }, []);

  // ✅ Actions
  const signUp = async (email: string, password: string) => {
    const redirectBase = getBaseUrl();
    const result = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${redirectBase}/auth/callback`,
        data: {
          username: email.split("@")[0],
          full_name: email.split("@")[0],
        },
      },
    });
    return { error: result.error };
  };

  const signIn = async (email: string, password: string) => {
    const result = await supabase.auth.signInWithPassword({ email, password });
    return { error: result.error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.replace("/");
  };

  const resetPassword = async (email: string) => {
    const redirectBase = getBaseUrl();
    const result = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${redirectBase}/auth/callback`,
    });
    return { error: result.error };
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
