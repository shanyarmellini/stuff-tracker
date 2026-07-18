"use server";

import { redirect } from "next/navigation";
import { getPostHogClient } from "~/lib/posthog-server";
import { createClient } from "~/lib/supabase/server";

export async function saveOnboarding(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/signup");

  const itemTypes = formData.getAll("item_types") as string[];
  const gender = formData.get("gender") as string | null;
  const age = formData.get("age") ? Number(formData.get("age")) : null;
  const emailScanConsent = formData.get("email_scan_consent") === "on";

  const { error } = await supabase.from("profiles").upsert({
    user_id: user.id,
    item_types: itemTypes,
    gender: gender || null,
    age,
    onboarding_complete: true,
    email_scan_consent: emailScanConsent,
    email_scan_consent_at: emailScanConsent ? new Date().toISOString() : null,
  });

  if (error) {
    console.error("Failed to save onboarding:", error);
    redirect("/onboarding");
  }

  const posthog = getPostHogClient();
  posthog.capture({
    distinctId: user.id,
    event: "onboarding_completed",
    properties: {
      item_types_count: itemTypes.length,
      gender: gender || null,
      age: age,
    },
  });
  await posthog.flush();

  redirect("/dashboard");
}
