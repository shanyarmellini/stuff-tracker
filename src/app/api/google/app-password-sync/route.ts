import { NextResponse } from "next/server";
import { scanAppPasswordGmailForItems } from "~/lib/google/scan-app-password-purchases";
import { createClient } from "~/lib/supabase/server";

/**
 * Manually re-runs the Gmail App Password purchase scan for the signed-in
 * user. The onboarding flow only runs this once automatically and swallows
 * errors so onboarding never gets stuck - this route re-runs it on demand
 * and surfaces exactly what happened (or what failed) for debugging and for
 * users who want to sync again later.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await scanAppPasswordGmailForItems(supabase, user.id);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
