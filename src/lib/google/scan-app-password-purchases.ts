import type { SupabaseClient } from "@supabase/supabase-js";
import {
  describePurchaseExtractionRequest,
  type PurchaseCandidateEmail,
  type PurchaseExtractionRequest,
} from "~/lib/ai/extractPurchases";
import {
  debugScanPipeline,
  type EnvelopeSummary,
  findPurchaseCandidateEmailsViaImap,
  loadAppPasswordConnection,
} from "~/lib/google/gmail-app-password";
import {
  MOCK_CANDIDATE_EMAILS,
  MOCK_GMAIL_ENABLED,
} from "~/lib/google/mock-emails";
import {
  extractInBatches,
  filterAlreadyImported,
  getItemTypes,
  insertExtractedPurchases,
  splitIntoAiBatches,
} from "~/lib/items/import-purchases";
import { createAdminClient } from "~/lib/supabase/admin";

// This is a one-time full-history import (unlike the incremental OAuth
// sync-purchases route), so the cap is much higher. These are survivors
// after the IMAP layer has already dropped marketing noise, so each slot is
// a likely-real purchase. Raised 100 -> 200 after real scans hit the cap
// exactly, cutting off older receipts from low-frequency merchants.
const MAX_SCAN_CANDIDATES = 200;

type ScanAppPasswordResult = { added: number };

async function findCandidates(
  userId: string,
): Promise<PurchaseCandidateEmail[]> {
  if (MOCK_GMAIL_ENABLED) return MOCK_CANDIDATE_EMAILS;

  const connection = await loadAppPasswordConnection(userId);
  if (!connection) return [];

  return findPurchaseCandidateEmailsViaImap(
    connection.email,
    connection.app_password,
    { limit: MAX_SCAN_CANDIDATES },
  );
}

// Shape persisted into email_scan_logs (candidates/sent_to_ai jsonb columns)
// for admin debugging - see the migration for why this includes full bodies.
function toLoggedEmail(email: PurchaseCandidateEmail) {
  return {
    message_id: email.id,
    from: email.from,
    subject: email.subject,
    body_text: email.bodyText,
  };
}

async function logScan(
  userId: string,
  candidates: PurchaseCandidateEmail[],
  sentToAi: PurchaseCandidateEmail[],
) {
  const { error } = await createAdminClient()
    .from("email_scan_logs")
    .insert({
      user_id: userId,
      candidates: candidates.map(toLoggedEmail),
      sent_to_ai: sentToAi.map(toLoggedEmail),
    });
  if (error) console.error("Failed to write email scan log:", error.message);
}

/**
 * Scans a user's Gmail App Password-connected inbox for purchase
 * confirmations and turns them into items (connect -> search -> extract ->
 * insert). Throws on failure.
 */
export async function scanAppPasswordGmailForItems(
  supabase: SupabaseClient,
  userId: string,
): Promise<ScanAppPasswordResult> {
  const candidates = await findCandidates(userId);
  if (candidates.length === 0) return { added: 0 };

  const fresh = await filterAlreadyImported(supabase, userId, candidates);
  await logScan(userId, candidates, fresh);

  const itemTypes = await getItemTypes(supabase, userId);

  const extracted = await extractInBatches(fresh, itemTypes);
  const insertedIds = await insertExtractedPurchases(
    supabase,
    userId,
    extracted,
    itemTypes,
  );
  return { added: insertedIds.length };
}

export type ScanPipelineTestResult = Omit<
  Awaited<ReturnType<typeof debugScanPipeline>>,
  "candidates"
> & {
  ai: {
    alreadyImported: EnvelopeSummary[];
    existingCategories: string[];
    // The tool definition (instructions + schema) is identical for every
    // batch, so it's returned once; only the user message differs.
    provider: PurchaseExtractionRequest["provider"];
    model: string;
    tool: PurchaseExtractionRequest["tool"];
    batches: { emails: EnvelopeSummary[]; userMessage: string }[];
  };
};

/**
 * Dry run of `scanAppPasswordGmailForItems` for the admin debug tool: runs
 * every step up to the AI call and returns what each one produced, plus the
 * exact AI requests that would be sent. Makes no AI call and creates no items.
 */
export async function testAppPasswordScanPipeline(
  supabase: SupabaseClient,
  userId: string,
): Promise<ScanPipelineTestResult | null> {
  const connection = await loadAppPasswordConnection(userId);
  if (!connection) return null;

  const { candidates, ...imapSteps } = await debugScanPipeline(
    connection.email,
    connection.app_password,
    { limit: MAX_SCAN_CANDIDATES },
  );

  const fresh = await filterAlreadyImported(supabase, userId, candidates);
  const freshIds = new Set(fresh.map((email) => email.id));
  const existingCategories = await getItemTypes(supabase, userId);
  const { provider, model, tool } = describePurchaseExtractionRequest(
    [],
    existingCategories,
  );

  return {
    ...imapSteps,
    ai: {
      alreadyImported: candidates
        .filter((email) => !freshIds.has(email.id))
        .map(({ subject, from }) => ({ subject, from })),
      existingCategories,
      provider,
      model,
      tool,
      batches: splitIntoAiBatches(fresh).map((batch) => ({
        emails: batch.map(({ subject, from }) => ({ subject, from })),
        userMessage: describePurchaseExtractionRequest(
          batch,
          existingCategories,
        ).userMessage,
      })),
    },
  };
}
