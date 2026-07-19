import { createClient } from "~/lib/supabase/server";
import { OnboardingSteps } from "./onboarding-steps";

// The automatic Gmail scan (scanConnectedGmailForItems) can take a while for
// accounts with a lot of purchase history - give it more room than the
// platform default before the function gets cut off.
export const maxDuration = 60;

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <OnboardingSteps email={user?.email ?? null} />;
}
