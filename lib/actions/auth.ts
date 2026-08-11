"use server";

import { createClient, createAnonAuthClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

export interface AuthResult {
  error?: string;
  requiresConfirmation?: boolean;
  message?: string;
}

/** Turns any thrown/returned error into a safe, user-facing message while
 * logging the real cause server-side (visible in Vercel's function logs)
 * so a production issue is actually diagnosable instead of surfacing only
 * as a generic string in the browser.
 *
 * TEMPORARY DIAGNOSTIC NOTE: this logs err.name/.cause in addition to
 * .message specifically to root-cause a "fetch failed" that showed up in
 * production despite Vercel recording a completed outbound request. The
 * shallow .message alone ("fetch failed") is Node/undici's generic
 * wrapper string for any connection-level failure and doesn't say which
 * one — .cause is where the real reason lives (e.g. a code like
 * ECONNRESET, ETIMEDOUT, or a TLS/cert error). Safe to leave in
 * long-term (no secrets, no PII — email/password/keys are never passed
 * to this function), but flagged here in case you want to trim it once
 * the issue is confirmed fixed. */
function logAndDescribe(context: string, err: unknown): string {
  if (err instanceof Error) {
    const cause = (err as Error & { cause?: unknown }).cause;
    // eslint-disable-next-line no-console
    console.error(`[auth:${context}]`, {
      name: err.name,
      message: err.message,
      cause:
        cause instanceof Error
          ? { name: cause.name, message: cause.message, code: (cause as NodeJS.ErrnoException).code }
          : cause,
    });

    // Node's fetch (undici) throws exactly this message when it can't
    // reach the target host at all — DNS failure, connection refused, the
    // Supabase project paused, or the request never left the function
    // because the Supabase client was misconfigured. This is the
    // symptom, not a description a user should see verbatim, so we
    // translate it into something actionable for whoever is running
    // this deployment.
    if (err.message === "fetch failed") {
      return "Could not reach the authentication service. If you're the site operator: verify NEXT_PUBLIC_SUPABASE_URL is correct and set for the Production environment, and that the Supabase project isn't paused. Check the function logs for this request's [auth:...] entry — it now includes the underlying connection error (err.cause), not just this generic message.";
    }
    return err.message;
  }
  // eslint-disable-next-line no-console
  console.error(`[auth:${context}] non-Error thrown:`, err);
  return "Something went wrong. Please try again.";
}

/** True only for the raw, connection-level fetch failure — never for an
 * actual AuthApiError response from Supabase (those resolve normally and
 * come back as `{ error }`, not a thrown TypeError). Used to decide
 * whether a single retry is safe: retrying on "we never got a response"
 * can't double-fire anything, since nothing was sent successfully. */
function isRawNetworkFailure(err: unknown): boolean {
  return err instanceof Error && err.message === "fetch failed";
}

const ALLOWED_EMAIL_OTP_TYPES: EmailOtpType[] = [
  "email",
  "recovery",
  "invite",
  "email_change",
];

/**
 * Exchange a token_hash from an email link for a session.
 * Must only be called from an explicit user action (form POST), never from
 * a bare GET — automated email scanners would otherwise consume the
 * single-use token before the real user confirms.
 */
export async function confirmEmailOtp(formData: FormData): Promise<void> {
  const tokenHash = String(formData.get("token_hash") || "").trim();
  const typeParam = String(formData.get("type") || "").trim();
  const requestedNext = String(formData.get("next") || "").trim() || null;

  const defaultNext =
    typeParam === "recovery" ? "/update-password" : "/onboarding";
  const next = safeRedirectPath(requestedNext, defaultNext);

  const errorPage =
    typeParam === "recovery" ? "/forgot-password" : "/signup";

  if (!tokenHash || !typeParam) {
    redirect(`${errorPage}?error=missing_code`);
  }

  if (!ALLOWED_EMAIL_OTP_TYPES.includes(typeParam as EmailOtpType)) {
    console.error("[auth:confirmEmailOtp] Invalid auth type", {
      type: typeParam,
    });
    redirect(`/signup?error=invalid_auth_type`);
  }

  try {
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: typeParam as EmailOtpType,
    });

    if (error) {
      console.error("[auth:confirmEmailOtp]", {
        message: error.message,
        name: error.name,
        type: typeParam,
      });
      redirect(`${errorPage}?error=invalid_or_expired_link`);
    }
  } catch (err) {
    console.error("[auth:confirmEmailOtp:unexpected]", err);
    redirect(`${errorPage}?error=authentication_failed`);
  }

  redirect(next);
}

export async function signUp(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const fullName = String(formData.get("fullName") || "").trim();

  if (!email || !password) return { error: "Email and password are required." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        // PKCE / ConfirmationURL redirects still land on the callback.
        // Token-hash signup emails should point at /auth/confirm (see template).
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback?next=/onboarding`,
      },
    });

    if (error) {
      if (error.message === "email rate limit exceeded") {
        return {
          error:
            "Too many signup attempts. Please wait a few minutes before trying again.",
        };
      }
      return { error: error.message };
    }

    // If no session is returned, email confirmation is required
    if (!data.session && data.user) {
      return {
        requiresConfirmation: true,
        message: "Please check your email to confirm your account.",
      };
    }
  } catch (err) {
    return { error: logAndDescribe("signUp", err) };
  }

  redirect("/onboarding");
}

export async function signIn(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) return { error: "Email and password are required." };

  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: "Incorrect email or password." };
  } catch (err) {
    return { error: logAndDescribe("signIn", err) };
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") || "").trim();
  if (!email) return { error: "Enter your email address." };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const redirectTo = `${siteUrl}/auth/callback?next=/update-password`;

  // Uses createAnonAuthClient(), NOT the shared createClient() — this is
  // an anonymous-only operation, and isolating it means it can't be
  // affected by a stale/expired session cookie triggering background
  // token-refresh behavior on the shared client. See the comment on
  // createAnonAuthClient() in lib/supabase/server.ts for the full
  // reasoning.
  async function attempt(): Promise<AuthResult> {
    const supabase = createAnonAuthClient();
    // Goes through /auth/callback (which exchanges the recovery code for a
    // session and sets the auth cookies) and only then on to
    // /update-password — going straight to /update-password with
    // redirectTo would leave the visitor unauthenticated on that page,
    // since @supabase/ssr uses the PKCE flow, not the older implicit
    // (hash-fragment token) flow.
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) return { error: logAndDescribe("requestPasswordReset", error) };
    return {};
  }

  try {
    return await attempt();
  } catch (err) {
    // A single retry, and only for a raw connection-level failure (see
    // isRawNetworkFailure) — this is a known class of transient issue on
    // serverless platforms where a pooled/kept-alive connection to an
    // infrequently-called host gets reset between the pool marking it
    // reusable and the next request actually using it. Frequently-called
    // endpoints (a session's /token or /user calls) rarely hit this
    // because their connections stay warm; a rarely-called one like
    // /recover is exactly where it tends to surface. Safe to retry
    // specifically because "fetch failed" here means no request was
    // ever successfully sent — there's no risk of sending the reset
    // email twice.
    if (isRawNetworkFailure(err)) {
      // eslint-disable-next-line no-console
      console.error("[auth:requestPasswordReset] first attempt failed with a raw network error, retrying once");
      try {
        return await attempt();
      } catch (retryErr) {
        return { error: logAndDescribe("requestPasswordReset:retry", retryErr) };
      }
    }
    return { error: logAndDescribe("requestPasswordReset", err) };
  }
}

export async function updatePassword(formData: FormData): Promise<AuthResult> {
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirmPassword) return { error: "Passwords don't match." };

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // getUser() succeeding here is what proves the recovery link's code
    // was already exchanged for a real session by /auth/callback — if
    // there's no user, the visitor reached this page without a valid
    // (or already-used/expired) recovery link.
    if (!user) {
      return { error: "Your reset link has expired or was already used. Please request a new one." };
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: logAndDescribe("updatePassword", error) };
  } catch (err) {
    return { error: logAndDescribe("updatePassword", err) };
  }

  redirect("/dashboard");
}
