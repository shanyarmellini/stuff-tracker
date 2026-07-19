"use server";

import { redirect } from "next/navigation";
import { checkGmailAppPassword } from "~/lib/google/gmail-app-password";
import { scanAppPasswordGmailForItems } from "~/lib/google/scan-app-password-purchases";
import { getPostHogClient } from "~/lib/posthog-server";
import { createAdminClient } from "~/lib/supabase/admin";
import { createClient } from "~/lib/supabase/server";

export type VerifyAppPasswordResult =
  | { ok: true }
  | { ok: false; error: string };

export async function verifyGmailAppPassword(
  appPassword: string,
): Promise<VerifyAppPasswordResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { ok: false, error: "You must be signed in to connect Gmail." };
  }

  const normalized = appPassword.replace(/\s+/g, "");
  if (normalized.length !== 16) {
    return { ok: false, error: "App passwords are 16 characters long." };
  }

  const result = await checkGmailAppPassword(user.email, normalized);
  if (!result.ok) {
    return {
      ok: false,
      error:
        result.reason === "invalid_credentials"
          ? "That app password didn't work. Double-check you copied it correctly."
          : "Couldn't reach Gmail to verify that password. Please try again.",
    };
  }

  const { error } = await createAdminClient()
    .from("gmail_app_connections")
    .upsert({
      user_id: user.id,
      email: user.email,
      app_password: normalized,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error("Failed to save Gmail app password:", error);
    return { ok: false, error: "Failed to save your app password." };
  }

  return { ok: true };
}

export type ScanGmailResult = { added: number };

/**
 * Called automatically right after the onboarding Gmail App Password step
 * succeeds - scans the connected inbox for purchase confirmations and turns
 * them into items so the user's dashboard is already populated by the time
 * they finish onboarding.
 */
export async function scanConnectedGmailForItems(): Promise<ScanGmailResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { added: 0 };

  let result: Awaited<ReturnType<typeof scanAppPasswordGmailForItems>>;
  try {
    result = await scanAppPasswordGmailForItems(supabase, user.id);
  } catch (err) {
    console.error("Failed to scan Gmail during onboarding:", err);
    return { added: 0 };
  }

  const posthog = getPostHogClient();
  posthog.capture({
    distinctId: user.id,
    event: "onboarding_gmail_scan_completed",
    properties: {
      items_added: result.added,
      candidates_found: result.candidatesFound,
    },
  });
  await posthog.flush();

  return { added: result.added };
}

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
