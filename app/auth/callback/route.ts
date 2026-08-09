import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");

  const next =
    safeRedirectPath(url.searchParams.get("next")) ||
    "/update-password";

  const origin = url.origin;

  if (!code) {
    return NextResponse.redirect(
      `${origin}/forgot-password?error=missing_code`
    );
  }

  const supabase = createClient();

  const { error } =
    await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("AUTH CALLBACK ERROR:", error);

    return NextResponse.redirect(
      `${origin}/forgot-password?error=${encodeURIComponent(error.message)}`
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
