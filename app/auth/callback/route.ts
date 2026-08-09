import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  const token = searchParams.get("token");
  const type = searchParams.get("type");

  const supabase = createClient();

  if (token && type === "recovery") {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: "recovery",
    });

    if (error) {
      console.error(error);

      return NextResponse.redirect(
        `${origin}/forgot-password?error=invalid_or_expired_link`
      );
    }

    return NextResponse.redirect(
      `${origin}/update-password`
    );
  }

  return NextResponse.redirect(
    `${origin}/forgot-password?error=missing_code`
  );
}
