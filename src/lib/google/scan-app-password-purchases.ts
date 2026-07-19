import type { SupabaseClient } from "@supabase/supabase-js";
import { extractPurchasesFromEmails } from "~/lib/ai/extractPurchases";
import { findPurchaseCandidateEmailsViaImap } from "~/lib/google/gmail-app-password";
import { insertExtractedPurchases } from "~/lib/items/insert-extracted-purchases";
import { createAdminClient } from "~/lib/supabase/admin";

const SCAN_BATCH_SIZE = 8;
const MAX_SCAN_CANDIDATES = 20;

export type ScanAppPasswordResult = {
  connected: boolean;
  candidatesFound: number;
  freshCandidates: number;
  extracted: number;
  added: number;
};

/**
 * Scans a user's Gmail App Password-connected inbox for purchase
 * confirmations and turns them into items. Shared by the automatic
 * onboarding scan and the manual re-sync debug route - both need the same
 * connect -> search -> extract -> insert pipeline.
 */
export async function scanAppPasswordGmailForItems(
  supabase: SupabaseClient,
  userId: string,
): Promise<ScanAppPasswordResult> {
  const admin = createAdminClient();
  const { data: connection } = await admin
    .from("gmail_app_connections")
    .select("email, app_password")
    .eq("user_id", userId)
    .maybeSingle();

  if (!connection) {
    return {
      connected: false,
      candidatesFound: 0,
      freshCandidates: 0,
      extracted: 0,
      added: 0,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("item_types")
    .eq("user_id", userId)
    .maybeSingle();

  const candidates = await findPurchaseCandidateEmailsViaImap(
    connection.email,
    connection.app_password,
    { limit: MAX_SCAN_CANDIDATES },
  );

  if (candidates.length === 0) {
    return {
      connected: true,
      candidatesFound: 0,
      freshCandidates: 0,
      extracted: 0,
      added: 0,
    };
  }

  const { data: existingRows } = await supabase
    .from("items")
    .select("gmail_message_id")
    .eq("user_id", userId)
    .in(
      "gmail_message_id",
      candidates.map((c) => c.id),
    );
  const alreadyImported = new Set(
    (existingRows ?? []).map((row) => row.gmail_message_id),
  );
  const fresh = candidates.filter((c) => !alreadyImported.has(c.id));

  const extracted = [];
  for (let i = 0; i < fresh.length; i += SCAN_BATCH_SIZE) {
    const { items } = await extractPurchasesFromEmails(
      fresh.slice(i, i + SCAN_BATCH_SIZE),
    );
    extracted.push(...items);
  }

  const { added } = await insertExtractedPurchases(
    supabase,
    userId,
    extracted,
    profile?.item_types ?? [],
  );

  return {
    connected: true,
    candidatesFound: candidates.length,
    freshCandidates: fresh.length,
    extracted: extracted.length,
    added,
  };
}
