import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { searchParams, origin } = url;

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const typeParam = searchParams.get("type");

  const requestedNext = searchParams.get("next");

  // Signup confirmation should go to onboarding.
  // Password recovery should go to update-password.
  const defaultNext =
    typeParam === "recovery" ? "/update-password" : "/onboarding";
  const next = safeRedirectPath(requestedNext, defaultNext);

  // Supabase may redirect authentication errors back to the
  // requested redirect URL. Handle those before looking for code/token.
  const authError = searchParams.get("error");
  const authErrorCode = searchParams.get("error_code");
  const authErrorDescription = searchParams.get("error_description");

  if (authError || authErrorCode) {
    console.error("[auth:callback:error]", {
      error: authError,
      errorCode: authErrorCode,
      description: authErrorDescription,
      type: typeParam,
    });

    const errorPage =
      typeParam === "recovery" ? "/forgot-password" : "/signup";

    const errorUrl = new URL(errorPage, origin);
    errorUrl.searchParams.set(
      "error",
      authErrorCode || "authentication_failed"
    );

    return NextResponse.redirect(errorUrl);
  }

  // Token-hash links must not verify on GET — email scanners can consume
  // the single-use token before the user clicks. Send them to the explicit
  // confirm page instead (no auth side effect).
  if (tokenHash && typeParam) {
    const confirmUrl = new URL("/auth/confirm", origin);
    confirmUrl.searchParams.set("token_hash", tokenHash);
    confirmUrl.searchParams.set("type", typeParam);
    confirmUrl.searchParams.set("next", next);
    return NextResponse.redirect(confirmUrl);
  }

  if (!code) {
    console.error("[auth:callback] Missing authentication code", {
      hasCode: false,
      hasTokenHash: Boolean(tokenHash),
      type: typeParam,
    });

    const errorPage =
      typeParam === "recovery" ? "/forgot-password" : "/signup";

    const errorUrl = new URL(errorPage, origin);
    errorUrl.searchParams.set("error", "missing_code");

    return NextResponse.redirect(errorUrl);
  }

  const supabase = createClient();

  try {
    // PKCE flow (password recovery and any ConfirmationURL redirects)
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[auth:callback:pkce]", {
        message: error.message,
        name: error.name,
      });

      const errorPage =
        typeParam === "recovery" ? "/forgot-password" : "/signup";

      const errorUrl = new URL(errorPage, origin);
      errorUrl.searchParams.set("error", "invalid_or_expired_link");

      return NextResponse.redirect(errorUrl);
    }

    return NextResponse.redirect(new URL(next, origin));
  } catch (error) {
    console.error("[auth:callback:unexpected]", error);

    const errorPage =
      typeParam === "recovery" ? "/forgot-password" : "/signup";

    const errorUrl = new URL(errorPage, origin);
    errorUrl.searchParams.set("error", "authentication_failed");

    return NextResponse.redirect(errorUrl);
  }
}
