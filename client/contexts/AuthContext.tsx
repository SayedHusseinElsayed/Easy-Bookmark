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
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

// Helper: base URL for redirects (use .env if present, else current origin)
function getBaseUrl(): string {
  // Vite-style env var (optional): VITE_APP_URL=http://localhost:8080
  const fromEnv = (import.meta as any)?.env?.VITE_APP_URL as string | undefined;
  return fromEnv || window.location.origin;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // 1) Handle initial session and auth state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Useful for debugging: console.log("Auth event:", event, session);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2) Handle Supabase callback links (email confirmation, recovery, etc.)
  //    This runs on ANY route, so you don't need a dedicated /auth/callback page.
  useEffect(() => {
    const url = new URL(window.location.href);
    const hash = url.hash?.startsWith("#") ? url.hash.slice(1) : "";

    if (!hash) return;

    const params = new URLSearchParams(hash);
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    const type = params.get("type"); // e.g., "signup", "recovery"
    const error_description = params.get("error_description");

    if (error_description) {
      console.error("Supabase verification error:", decodeURIComponent(error_description));
      // Clean the hash so your UI doesn't keep showing a failed state
      const clean = url.origin + url.pathname + url.search;
      window.history.replaceState({}, "", clean);
      return;
    }

    if (access_token && refresh_token) {
      // Establish session from the tokens in the URL fragment
      supabase.auth
        .setSession({ access_token, refresh_token })
        .then(({ data, error }) => {
          if (error) {
            console.error("setSession error:", error);
            return;
          }

          setSession(data.session ?? null);
          setUser(data.session?.user ?? null);

          // Clean the URL (remove the token hash)
          const clean = url.origin + url.pathname + url.search;
          window.history.replaceState({}, "", clean);

          // Redirect after success (adjust to your app)
          if (type === "recovery") {
            // If you're doing a password reset flow, send them to a reset page you handle
            window.location.replace("/reset-password");
          } else {
            // Default after email verification, show a success page
            window.location.replace("/auth/callback");
          }
        })
        .catch((e) => console.error("setSession exception:", e));
    }
  }, []);

  const signUp = async (email: string, password: string) => {
    const redirectBase = getBaseUrl(); // e.g., http://localhost:8080
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

    if (result.data?.user && !result.data.user.email_confirmed_at) {
      console.log("User created; verification email sent.");
    }

    return { error: result.error };
  };

  const signIn = async (email: string, password: string) => {
    const result = await supabase.auth.signInWithPassword({ email, password });
    return { error: result.error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    // Optional redirect after logout
    window.location.replace("/");
  };

  const resetPassword = async (email: string) => {
    const redirectBase = getBaseUrl();
    const result = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectBase,
    });
    return { error: result.error };
  };

  const updatePassword = async (password: string) => {
    const { data, error } = await supabase.auth.updateUser({ password });
    return { error };
  };

  const value = { user, session, loading, signUp, signIn, signOut, resetPassword, updatePassword };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
