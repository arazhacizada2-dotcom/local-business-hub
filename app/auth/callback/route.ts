import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const token = searchParams.get("token");
  const type = searchParams.get("type");
  const next = safeRedirectPath(searchParams.get("next")) || "/update-password";

  const supabase = createClient();
  let error: any = null;

  if (code) {
    // PKCE flow
    const { error: codeError } = await supabase.auth.exchangeCodeForSession(code);
    error = codeError;
  } else if (type === "recovery" && token) {
    // Legacy token flow
    const { error: otpError } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: "recovery",
    });
    error = otpError;
  } else {
    return NextResponse.redirect(
      `${origin}/forgot-password?error=missing_code`
    );
  }

  if (error) {
    console.error("[auth:callback]", {
      message: error.message,
      name: error.name,
    });

    return NextResponse.redirect(
      `${origin}/forgot-password?error=invalid_or_expired_link`
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
