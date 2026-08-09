import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
  const cookieStore = cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Fail fast with a specific, actionable message instead of letting a
  // missing/blank env var surface many calls later as an opaque "fetch
  // failed" deep inside the Supabase SDK (which is exactly what happens
  // if these are undefined: the SDK still attempts a fetch() to a
  // malformed URL). This is the single most common cause of that error
  // in production — the env var was never set for the "Production"
  // environment in the hosting provider's dashboard, or was added after
  // the last deploy and the app was never redeployed to pick it up.
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase environment variables are missing at runtime. " +
        "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must both be " +
        "set for the Production environment in your hosting provider's dashboard " +
        "(not just Preview/Development), and the app redeployed after adding them."
    );
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, any> }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component with no writable cookie store.
          // Safe to ignore because middleware refreshes the session.
        }
      },
    },
    auth: {
      // autoRefreshToken sets up a background setInterval to proactively
      // renew the access token — meant for a long-lived browser tab, not
      // a serverless function that returns a response and is torn down
      // immediately after. Left at its default (true), if a stale or
      // expired session cookie happens to be present on a request, this
      // client can kick off a background token-refresh call around
      // whatever auth operation you actually asked for, competing for
      // supabase-js's internal auth lock. Explicitly off here since
      // nothing server-side benefits from it.
      autoRefreshToken: false,
      // There's no URL fragment to inspect on the server (that's a
      // browser-only concept for the implicit grant flow); always false
      // in a server context regardless of flow type.
      detectSessionInUrl: false,
      // Left at its default (true) deliberately: middleware, the
      // dashboard layout, and updatePassword() all depend on this client
      // being able to read the caller's existing session from the
      // cookies passed in above. Setting this false would stop the
      // client from hydrating from that cookie storage at all, breaking
      // every one of those reads — not safe to change here.
    },
  });
}

/**
 * A second, fully isolated Supabase client for auth operations that are
 * inherently anonymous and must never be influenced by whatever session
 * cookie happens to be present on the request — currently used only by
 * requestPasswordReset(). Deliberately has NO cookie adapter (a request
 * for a password-reset email should never read or write a session) and
 * persistSession/autoRefreshToken fully off, so there is no session
 * state for this client to hydrate, refresh, or contend a lock over
 * before making the one call it exists to make.
 *
 * This is the more surgical fix compared to changing persistSession on
 * the shared client above: that client's session-reading behavior is
 * depended on elsewhere (see the comment on it), so weakening it
 * globally to fix one anonymous-only call would risk breaking auth
 * everywhere else. Isolating the anonymous call instead touches nothing
 * else.
 */
export function createAnonAuthClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase environment variables are missing at runtime. " +
        "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must both be " +
        "set for the Production environment in your hosting provider's dashboard " +
        "(not just Preview/Development), and the app redeployed after adding them."
    );
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    // No cookies adapter: this client should never read an existing
    // session cookie (so it can't inherit a stale/expired one) and never
    // writes one (a password-reset request doesn't create a session).
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        // Intentionally a no-op — see the note above.
      },
    },
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
