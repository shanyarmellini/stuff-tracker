import { google } from "googleapis";
import { NextResponse } from "next/server";
import { createGoogleOAuthClient } from "~/lib/google/oauth";
import { getPostHogClient } from "~/lib/posthog-server";
import { createAdminClient } from "~/lib/supabase/admin";
import { createClient } from "~/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const redirectWithError = (message: string) =>
    NextResponse.redirect(
      `${origin}/dashboard/emails?gmail_error=${encodeURIComponent(message)}`,
    );

  const deniedOrError = searchParams.get("error");
  if (deniedOrError) {
    return redirectWithError("Google sign-in was cancelled.");
  }

  const code = searchParams.get("code");
  if (!code) {
    return redirectWithError("Missing authorization code from Google.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/auth/login`);
  }

  const oauthClient = createGoogleOAuthClient();

  try {
    const { tokens } = await oauthClient.getToken(code);
    if (!tokens.refresh_token) {
      return redirectWithError(
        "Google didn't grant offline access. Remove Stuff Tracker from your Google account's third-party access and try again.",
      );
    }
    oauthClient.setCredentials(tokens);

    const gmail = google.gmail({ version: "v1", auth: oauthClient });
    const profile = await gmail.users.getProfile({ userId: "me" });

    const admin = createAdminClient();
    const { error: upsertError } = await admin
      .from("google_connections")
      .upsert({
        user_id: user.id,
        refresh_token: tokens.refresh_token,
        access_token: tokens.access_token,
        token_expires_at: tokens.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : null,
        scope: tokens.scope ?? null,
        email: profile.data.emailAddress ?? null,
        updated_at: new Date().toISOString(),
      });

    if (upsertError) {
      console.error("Failed to save Google connection:", upsertError.message);
      return redirectWithError("Failed to save your Google connection.");
    }

    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: user.id,
      event: "gmail_connected",
    });
    await posthog.flush();
  } catch (err) {
    console.error("Google OAuth callback failed:", err);
    return redirectWithError("Something went wrong connecting to Google.");
  }

  return NextResponse.redirect(`${origin}/dashboard/emails`);
}
