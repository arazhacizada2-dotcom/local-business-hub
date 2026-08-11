import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export function getSupabaseEnv() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!rawUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase env variables");
  }

  // Trailing slashes break auth request paths.
  const supabaseUrl = rawUrl.replace(/\/$/, "");

  return { supabaseUrl, supabaseAnonKey };
}

/** Hostname only — safe to log in production (never logs the key). */
export function getSupabaseHostname(): string {
  const { supabaseUrl } = getSupabaseEnv();
  try {
    return new URL(supabaseUrl).hostname;
  } catch {
    return "unparseable-NEXT_PUBLIC_SUPABASE_URL";
  }
}

export function createClient() {
  const cookieStore = cookies();
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },

      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options?: Record<string, any>;
        }[]
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Cookie store may be read-only in some server contexts.
        }
      },
    },
  });
}

/**
 * Password-recovery client: plain @supabase/supabase-js (not @supabase/ssr)
 * with Next.js cookie storage for PKCE code_verifier.
 *
 * resetPasswordForEmail was failing in production with
 * AuthRetryableFetchError: fetch failed (cause undefined) when going through
 * createServerClient. This client hits the same project URL/key as the rest
 * of the app but uses the standard auth-js fetch path.
 */
export function createPasswordResetClient() {
  const cookieStore = cookies();
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();

  return createSupabaseJsClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: "pkce",
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: true,
      storage: {
        getItem(key: string) {
          return cookieStore.get(key)?.value ?? null;
        },
        setItem(key: string, value: string) {
          try {
            cookieStore.set(key, value, {
              path: "/",
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
              httpOnly: true,
            });
          } catch {
            // Ignore if cookies are read-only in this context.
          }
        },
        removeItem(key: string) {
          try {
            cookieStore.set(key, "", { path: "/", maxAge: 0 });
          } catch {
            // ignore
          }
        },
      },
    },
  });
}
