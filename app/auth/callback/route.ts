import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");

  const next =
    safeRedirectPath(searchParams.get("next")) ||
    "/update-password";

  if (!code) {
    return NextResponse.redirect(
      `${origin}/forgot-password?error=missing_code`
    );
  }

  const supabase = createClient();

  const { error } =
    await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error(error);

    return NextResponse.redirect(
      `${origin}/forgot-password?error=invalid_or_expired_link`
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
