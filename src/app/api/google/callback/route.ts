import { google } from "googleapis";
import { type NextRequest, NextResponse } from "next/server";
import {
  createGoogleOAuthClient,
  GMAIL_OAUTH_STATE_COOKIE,
} from "~/lib/google/oauth";
import { createAdminClient } from "~/lib/supabase/admin";
import { getCurrentUser } from "~/lib/supabase/server";

type ConnectResult = { ok: true } | { ok: false; error: string };

async function saveGoogleConnection(
  userId: string,
  code: string,
): Promise<ConnectResult> {
  const oauthClient = createGoogleOAuthClient();
  const { tokens } = await oauthClient.getToken(code);
  if (!tokens.refresh_token) {
    return {
      ok: false,
      error:
        "Google didn't grant offline access. Remove Stuff Tracker from your Google account's third-party access and try again.",
    };
  }
  oauthClient.setCredentials(tokens);
  const profile = await google
    .gmail({ version: "v1", auth: oauthClient })
    .users.getProfile({ userId: "me" });

  const { error } = await createAdminClient()
    .from("google_connections")
    .upsert({
      user_id: userId,
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
      token_expires_at: tokens.expiry_date
        ? new Date(tokens.expiry_date).toISOString()
        : null,
      scope: tokens.scope ?? null,
      email: profile.data.emailAddress ?? null,
      updated_at: new Date().toISOString(),
    });
  if (error) {
    console.error("Failed to save Google connection:", error.message);
    return { ok: false, error: "Failed to save your Google connection." };
  }
  return { ok: true };
}

async function connectGmail(request: NextRequest): Promise<string> {
  const { searchParams } = request.nextUrl;
  const errorPath = (message: string) =>
    `/dashboard/emails?gmail_error=${encodeURIComponent(message)}`;

  if (searchParams.get("error")) {
    return errorPath("Google sign-in was cancelled.");
  }
  const expectedState = request.cookies.get(GMAIL_OAUTH_STATE_COOKIE)?.value;
  if (!expectedState || searchParams.get("state") !== expectedState) {
    return errorPath("Google sign-in couldn't be verified. Please try again.");
  }
  const code = searchParams.get("code");
  if (!code) return errorPath("Missing authorization code from Google.");

  const { user } = await getCurrentUser();
  if (!user) return "/auth/login";

  try {
    const result = await saveGoogleConnection(user.id, code);
    if (!result.ok) return errorPath(result.error);
  } catch (err) {
    console.error("Google OAuth callback failed:", err);
    return errorPath("Something went wrong connecting to Google.");
  }
  return "/dashboard/emails";
}

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(
    new URL(await connectGmail(request), request.url),
  );
  response.cookies.delete(GMAIL_OAUTH_STATE_COOKIE);
  return response;
}
