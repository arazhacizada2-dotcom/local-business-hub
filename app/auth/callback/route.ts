import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const token = searchParams.get("token");
  const type = searchParams.get("type");

  const next =
    safeRedirectPath(searchParams.get("next")) ||
    "/update-password";

  const supabase = createClient();

  let error = null;

  if (code) {
    const result =
      await supabase.auth.exchangeCodeForSession(code);

    error = result.error;

  } else if (token && type === "recovery") {

    const result =
      await supabase.auth.verifyOtp({
        token_hash: token,
        type: "recovery",
      });

    error = result.error;

  } else {
    return NextResponse.redirect(
      `${origin}/forgot-password?error=missing_code`
    );
  }


  if (error) {
    console.error(error);

    return NextResponse.redirect(
      `${origin}/forgot-password?error=invalid_or_expired_link`
    );
  }


  return NextResponse.redirect(
    `${origin}${next}`
  );
}
