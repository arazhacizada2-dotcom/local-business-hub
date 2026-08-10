import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const next =
    safeRedirectPath(searchParams.get("next")) || "/update-password";

  const supabase = createClient();

  let error: any = null;

  // Modern PKCE flow
  if (code) {
    const { error: codeError } =
      await supabase.auth.exchangeCodeForSession(code);

    error = codeError;
  }

  // Token-hash flow
  else if (tokenHash && type) {
    const { error: otpError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as any,
    });

    error = otpError;
  }

  else {
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
