import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      `${url.origin}/forgot-password?error=missing_code`
    );
  }

  const supabase = createClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.log(error);
    return NextResponse.redirect(
      `${url.origin}/forgot-password?error=invalid_code`
    );
  }

  return NextResponse.redirect(
    `${url.origin}/update-password`
  );
}
