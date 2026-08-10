import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { EmailOtpType } from "@supabase/supabase-js";
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
  const next =
    safeRedirectPath(requestedNext) ||
    (typeParam === "recovery" ? "/update-password" : "/onboarding");

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

  if (!code && !(tokenHash && typeParam)) {
    console.error("[auth:callback] Missing authentication code/token", {
      hasCode: Boolean(code),
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
    // PKCE flow
    if (code) {
      const { error } =
        await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("[auth:callback:pkce]", {
          message: error.message,
          name: error.name,
        });

        const errorPage =
          typeParam === "recovery"
            ? "/forgot-password"
            : "/signup";

        const errorUrl = new URL(errorPage, origin);
        errorUrl.searchParams.set(
          "error",
          "invalid_or_expired_link"
        );

        return NextResponse.redirect(errorUrl);
      }
    }

    // Token-hash flow
    else if (tokenHash && typeParam) {
      const allowedTypes: EmailOtpType[] = [
        "email",
        "recovery",
        "invite",
        "email_change",
      ];

      if (!allowedTypes.includes(typeParam as EmailOtpType)) {
        console.error("[auth:callback] Invalid auth type", {
          type: typeParam,
        });

        const errorUrl = new URL("/signup", origin);
        errorUrl.searchParams.set("error", "invalid_auth_type");

        return NextResponse.redirect(errorUrl);
      }

      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: typeParam as EmailOtpType,
      });

      if (error) {
        console.error("[auth:callback:token]", {
          message: error.message,
          name: error.name,
          type: typeParam,
        });

        const errorPage =
          typeParam === "recovery"
            ? "/forgot-password"
            : "/signup";

        const errorUrl = new URL(errorPage, origin);
        errorUrl.searchParams.set(
          "error",
          "invalid_or_expired_link"
        );

        return NextResponse.redirect(errorUrl);
      }
    }

    // Authentication succeeded.
    return NextResponse.redirect(new URL(next, origin));
  } catch (error) {
    console.error("[auth:callback:unexpected]", error);

    const errorPage =
      typeParam === "recovery"
        ? "/forgot-password"
        : "/signup";

    const errorUrl = new URL(errorPage, origin);
    errorUrl.searchParams.set(
      "error",
      "authentication_failed"
    );

    return NextResponse.redirect(errorUrl);
  }
}
