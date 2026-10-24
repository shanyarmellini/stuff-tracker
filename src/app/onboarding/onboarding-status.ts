import { redirect } from "next/navigation";
import { getCurrentUser } from "~/lib/supabase/server";

/**
 * Redirects signed-out visitors to signup; otherwise reports whether the
 * user has finished onboarding. Used by the dashboard and onboarding layouts
 * to route users to whichever one they belong in.
 */
export async function hasCompletedOnboarding(): Promise<boolean> {
  const { supabase, user } = await getCurrentUser();
  if (!user) redirect("/auth/signup");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_complete")
    .eq("user_id", user.id)
    .single();

  return Boolean(profile?.onboarding_complete);
}
