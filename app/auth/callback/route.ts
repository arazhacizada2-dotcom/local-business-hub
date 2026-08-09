import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");

  console.log("AUTH CALLBACK URL:", url.toString());
  console.log("CODE:", code);

  if (!code) {
    return NextResponse.redirect(
      `${url.origin}/forgot-password?error=no_code`
    );
  }

  const supabase = createClient();

  const { error } =
    await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error(
      "EXCHANGE ERROR:",
      error.message
    );

    return NextResponse.redirect(
      `${url.origin}/forgot-password?error=${encodeURIComponent(error.message)}`
    );
  }

  return NextResponse.redirect(
    `${url.origin}/update-password`
  );
}
