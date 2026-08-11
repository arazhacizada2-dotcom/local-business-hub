import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase env variables");
  }

  // Trailing slashes break some auth request paths under @supabase/ssr.
  return {
    supabaseUrl: supabaseUrl.replace(/\/$/, ""),
    supabaseAnonKey,
  };
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
 * Isolated Supabase client for anonymous authentication operations.
 * Does not read or write the user's existing auth cookies.
 */
export function createAnonAuthClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return [];
      },

      setAll() {
        // Intentionally disabled for this anonymous-only client.
      },
    },

    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
