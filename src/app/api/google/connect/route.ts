import { NextResponse } from "next/server";
import {
  createGoogleOAuthClient,
  GMAIL_OAUTH_STATE_COOKIE,
  GMAIL_OAUTH_STATE_MAX_AGE_SECONDS,
  GMAIL_READONLY_SCOPE,
} from "~/lib/google/oauth";
import { getCurrentUser } from "~/lib/supabase/server";

// Browser navigation (not fetch), so signed-out users are redirected to log
// in rather than given a 401.
export async function GET(request: Request) {
  const { user } = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  const state = crypto.randomUUID();
  const authUrl = createGoogleOAuthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [GMAIL_READONLY_SCOPE],
    state,
  });

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(GMAIL_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: GMAIL_OAUTH_STATE_MAX_AGE_SECONDS,
  });
  return response;
}
