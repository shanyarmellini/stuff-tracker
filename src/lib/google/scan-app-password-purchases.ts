import type { SupabaseClient } from "@supabase/supabase-js";
import { extractPurchasesFromEmails } from "~/lib/ai/extractPurchases";
import { findPurchaseCandidateEmailsViaImap } from "~/lib/google/gmail-app-password";
import { insertExtractedPurchases } from "~/lib/items/insert-extracted-purchases";
import { createAdminClient } from "~/lib/supabase/admin";

const SCAN_BATCH_SIZE = 8;
// This is a one-time full-history import (unlike the incremental OAuth
// sync-purchases route), so the cap is much higher - raised from 20 after
// onboarding scans were missing most of a user's actual purchase history.
// These are the survivors after the IMAP layer has already dropped marketing
// noise, so each slot here is a likely-real purchase rather than a keyword
// coincidence - raised again once code-side denoising made the candidate set
// dense enough to be worth the extra AI batches.
const MAX_SCAN_CANDIDATES = 100;

export type ScanAppPasswordResult = {
  connected: boolean;
  candidatesFound: number;
  freshCandidates: number;
  extracted: number;
  added: number;
  // Temporary diagnostic: subjects of the fresh candidates that were fed to
  // the AI. Lets us tell "the search net is full of noise" apart from
  // "the AI extraction/insert pipeline is broken" without reading email
  // bodies. Remove once scan coverage is confirmed working end to end.
  sampleSubjects?: string[];
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

  const batches: (typeof fresh)[] = [];
  for (let i = 0; i < fresh.length; i += SCAN_BATCH_SIZE) {
    batches.push(fresh.slice(i, i + SCAN_BATCH_SIZE));
  }
  // Run batches concurrently rather than sequentially - this is a
  // serverless function with a wall-clock budget, and each batch is an
  // independent AI call, so there's no reason to pay for their latency
  // one after another.
  const batchResults = await Promise.all(
    batches.map((batch) =>
      extractPurchasesFromEmails(batch, 20, profile?.item_types ?? []),
    ),
  );
  const extracted = batchResults.flatMap((result) => result.items);

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
    sampleSubjects: fresh.slice(0, 20).map((c) => c.subject),
  };
}
