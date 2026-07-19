import { createClient } from "~/lib/supabase/server";
import { OnboardingSteps } from "./onboarding-steps";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <OnboardingSteps email={user?.email ?? null} />;
}
