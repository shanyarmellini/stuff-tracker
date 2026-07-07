import { NextResponse } from "next/server";
import {
  createGoogleOAuthClient,
  GMAIL_READONLY_SCOPE,
} from "~/lib/google/oauth";
import { createClient } from "~/lib/supabase/server";

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/auth/login`);
  }

  const oauthClient = createGoogleOAuthClient();
  const authUrl = oauthClient.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [GMAIL_READONLY_SCOPE],
  });

  return NextResponse.redirect(authUrl);
}
