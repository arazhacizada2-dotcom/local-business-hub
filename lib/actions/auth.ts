"use server";

import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

export interface AuthResult {
  error?: string;
  requiresConfirmation?: boolean;
  message?: string;
}

/** Turns any thrown/returned error into a safe, user-facing message while
 * logging the real cause server-side (visible in Vercel's function logs). */
function logAndDescribe(context: string, err: unknown): string {
  if (err instanceof Error) {
    const cause = (err as Error & { cause?: unknown }).cause;
    // eslint-disable-next-line no-console
    console.error(`[auth:${context}]`, {
      name: err.name,
      message: err.message,
      cause:
        cause instanceof Error
          ? {
              name: cause.name,
              message: cause.message,
              code: (cause as NodeJS.ErrnoException).code,
            }
          : cause,
    });

    if (isRawNetworkFailure(err)) {
      return "Could not reach the authentication service. Please try again in a moment. If this keeps happening, the site operator should verify NEXT_PUBLIC_SUPABASE_URL is set for Production and that the Supabase project is not paused.";
    }
    return err.message;
  }
  // eslint-disable-next-line no-console
  console.error(`[auth:${context}] non-Error thrown:`, err);
  return "Something went wrong. Please try again.";
}

/** True for connection-level failures (thrown or returned by supabase-js). */
function isRawNetworkFailure(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg === "fetch failed" ||
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("enotfound")
  );
}

function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (explicit) return explicit;

  // On Vercel, prefer the deployment host over localhost when SITE_URL is unset.
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;

  return "http://localhost:3000";
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
        emailRedirectTo: `${resolveSiteUrl()}/auth/callback?next=/onboarding`,
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

  const redirectTo = `${resolveSiteUrl()}/auth/callback?next=/update-password`;

  // Use the same createClient() path as login/signup so password reset shares
  // the proven server client, cookie adapter, and env handling. Isolation via
  // createAnonAuthClient previously returned network errors without retrying
  // when supabase-js surfaced them as { error } instead of a thrown exception.
  async function attempt(): Promise<{ ok: true } | { ok: false; error: unknown }> {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (error) return { ok: false, error };
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err };
    }
  }

  const first = await attempt();
  if (first.ok) return {};

  if (isRawNetworkFailure(first.error)) {
    // eslint-disable-next-line no-console
    console.error(
      "[auth:requestPasswordReset] network error on first attempt, retrying once",
      first.error instanceof Error ? first.error.message : first.error
    );
    const second = await attempt();
    if (second.ok) return {};
    return { error: logAndDescribe("requestPasswordReset:retry", second.error) };
  }

  return { error: logAndDescribe("requestPasswordReset", first.error) };
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

    if (!user) {
      return {
        error:
          "Your reset link has expired or was already used. Please request a new one.",
      };
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: logAndDescribe("updatePassword", error) };
  } catch (err) {
    return { error: logAndDescribe("updatePassword", err) };
  }

  redirect("/dashboard");
}
