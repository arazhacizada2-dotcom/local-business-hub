import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);

  const tokenHash = url.searchParams.get("token_hash");
  const token = url.searchParams.get("token");
  const type = url.searchParams.get("type");

  const supabase = createClient();

  // Supabase recovery link
  if (type === "recovery") {
    const hash = tokenHash || token;

    if (!hash) {
      return NextResponse.redirect(
        `${url.origin}/forgot-password?error=missing_token`
      );
    }

    const { error } = await supabase.auth.verifyOtp({
      token_hash: hash,
      type: "recovery",
    });

    if (error) {
      console.log("VERIFY ERROR:", error);

      return NextResponse.redirect(
        `${url.origin}/forgot-password?error=invalid_or_expired_link`
      );
    }

    return NextResponse.redirect(
      `${url.origin}/update-password`
    );
  }

  return NextResponse.redirect(
    `${url.origin}/forgot-password?error=invalid_request`
  );
}
