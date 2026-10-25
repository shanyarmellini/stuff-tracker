"use server";

import { redirect } from "next/navigation";
import { APP_PASSWORD_LENGTH } from "~/app/onboarding/constants";
import { checkGmailAppPassword } from "~/lib/google/gmail-app-password";
import { MOCK_GMAIL_ENABLED } from "~/lib/google/mock-emails";
import { scanAppPasswordGmailForItems } from "~/lib/google/scan-app-password-purchases";
import {
  onboardingDetailsSchema,
  type SaveScanCategoriesResult,
  saveScanCategoriesForUser,
} from "~/lib/profile/onboarding";
import { createAdminClient } from "~/lib/supabase/admin";
import { getCurrentUser } from "~/lib/supabase/server";

/**
 * First onboarding step: saves the broad categories scanning is limited to,
 * and seeds the dashboard categories with their subcategories. Runs before
 * Gmail is connected so the first scan already uses them.
 */
export async function saveScanCategories(
  categories: string[],
): Promise<SaveScanCategoriesResult> {
  const { supabase, user } = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in." };
  return saveScanCategoriesForUser(supabase, user.id, categories);
}

export type VerifyAppPasswordResult =
  | { ok: true }
  | { ok: false; error: string };

export async function verifyGmailAppPassword(
  appPassword: string,
): Promise<VerifyAppPasswordResult> {
  const { user } = await getCurrentUser();
  if (!user?.email) {
    return { ok: false, error: "You must be signed in to connect Gmail." };
  }

  const normalized = String(appPassword).replace(/\s+/g, "");
  if (normalized.length !== APP_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `App passwords are ${APP_PASSWORD_LENGTH} characters long.`,
    };
  }

  // Local testing only - skips the real IMAP check and connection save; the
  // scan step that follows uses fixture emails instead.
  if (MOCK_GMAIL_ENABLED) return { ok: true };

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
 * succeeds, so the dashboard is already populated when onboarding finishes.
 * Never throws - a failed scan must not block onboarding.
 */
export async function scanConnectedGmailForItems(): Promise<ScanGmailResult> {
  const { supabase, user } = await getCurrentUser();
  if (!user) return { added: 0 };

  try {
    return await scanAppPasswordGmailForItems(supabase, user.id);
  } catch (err) {
    console.error("Failed to scan Gmail during onboarding:", err);
    return { added: 0 };
  }
}

export async function saveOnboarding(formData: FormData) {
  const { supabase, user } = await getCurrentUser();
  if (!user) redirect("/auth/signup");

  const parsed = onboardingDetailsSchema.safeParse({
    gender: formData.get("gender"),
    age: formData.get("age"),
  });
  if (!parsed.success) redirect("/onboarding");

  // item_types and scan_categories were saved by saveScanCategories; upsert
  // only overwrites the columns listed here.
  const { gender, age } = parsed.data;
  const emailScanConsent = formData.get("email_scan_consent") === "on";
  const { error } = await supabase.from("profiles").upsert({
    user_id: user.id,
    gender,
    age,
    onboarding_complete: true,
    email_scan_consent: emailScanConsent,
    email_scan_consent_at: emailScanConsent ? new Date().toISOString() : null,
  });
  if (error) {
    console.error("Failed to save onboarding:", error);
    redirect("/onboarding");
  }

  redirect("/dashboard");
}
