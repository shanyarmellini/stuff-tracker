import { NextResponse } from "next/server";
import { createClient } from "~/lib/supabase/server";

// Only same-origin paths: "//host" and "/\host" are treated by browsers as
// protocol-relative URLs to another site.
function safeNextPath(next: string | null): string {
  return next && /^\/(?![/\\])/.test(next) ? next : "/dashboard";
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(
        `${origin}${safeNextPath(searchParams.get("next"))}`,
      );
    }
  }

  return NextResponse.redirect(
    `${origin}/auth/login?error=${encodeURIComponent("Could not authenticate with Google")}`,
  );
}
