import type { SupabaseClient } from "@supabase/supabase-js";
import {
  describePurchaseExtractionRequest,
  type ExtractedPurchase,
  type ExtractionBatchPreview,
  type PurchaseCandidateEmail,
  type PurchaseExtractionRequest,
  previewExtractionBatch,
} from "~/lib/ai/extractPurchases";
import { allowedCategoriesFor } from "~/lib/categories/taxonomy";
import {
  type EnvelopeSummary,
  findPurchaseCandidateEmailsViaImap,
  type ImapScanPipelineResult,
  loadAppPasswordConnection,
  type MockScanPipelineResult,
  runImapScanPipeline,
  runMockScanPipeline,
  toEnvelopeSummary,
} from "~/lib/google/gmail-app-password";
import { MOCK_EMAILS, MOCK_GMAIL_ENABLED } from "~/lib/google/mock-emails";
import {
  extractInBatches,
  filterAlreadyImported,
  getScanProfile,
  insertExtractedPurchases,
  type ScanProfile,
  splitIntoAiBatches,
} from "~/lib/items/import-purchases";
import { createAdminClient } from "~/lib/supabase/admin";

type ScanAppPasswordResult = { added: number };

async function findCandidates(
  userId: string,
  scanCategories: string[],
): Promise<PurchaseCandidateEmail[]> {
  if (MOCK_GMAIL_ENABLED) {
    return (await runMockScanPipeline(MOCK_EMAILS, scanCategories)).candidates;
  }

  const connection = await loadAppPasswordConnection(userId);
  if (!connection) return [];

  return findPurchaseCandidateEmailsViaImap(connection, scanCategories);
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
  const { itemTypes, scanCategories } = await getScanProfile(supabase, userId);
  const candidates = await findCandidates(userId, scanCategories);
  if (candidates.length === 0) return { added: 0 };

  const fresh = await filterAlreadyImported(supabase, userId, candidates);
  await logScan(userId, candidates, fresh);

  const extracted = await extractInBatches(
    fresh,
    itemTypes,
    allowedCategoriesFor(scanCategories, itemTypes),
  );
  const insertedIds = await insertExtractedPurchases(
    supabase,
    userId,
    extracted,
    itemTypes,
  );
  return { added: insertedIds.length };
}

// The request (provider, model, tool) is identical for every batch, so it's
// returned once; only the user message differs per batch.
type AiPreview = PurchaseExtractionRequest & {
  alreadyImported: EnvelopeSummary[];
  existingCategories: string[];
  // Empty when the user has no scan categories (no limit).
  allowedCategories: string[];
  batches: (ExtractionBatchPreview & { emails: EnvelopeSummary[] })[];
};

function buildAiPreview(
  emails: PurchaseCandidateEmail[],
  alreadyImported: EnvelopeSummary[],
  { itemTypes, scanCategories }: ScanProfile,
): AiPreview {
  const allowedCategories = allowedCategoriesFor(scanCategories, itemTypes);
  return {
    ...describePurchaseExtractionRequest(itemTypes, allowedCategories),
    alreadyImported,
    existingCategories: itemTypes,
    allowedCategories,
    batches: splitIntoAiBatches(emails).map((batch) => ({
      ...previewExtractionBatch(batch),
      emails: batch.map(toEnvelopeSummary),
    })),
  };
}

// Full email bodies stay on the server; the admin page only gets summaries
// plus the exact trimmed messages that would be sent to the AI.
export type ScanPipelineTestResult = Omit<
  ImapScanPipelineResult,
  "candidates"
> & { ai: AiPreview };

/**
 * Dry run of `scanAppPasswordGmailForItems` for the admin debug tool: every
 * filter, then the exact trimmed AI requests that would be sent. Makes the
 * same Jev calls as the real scan, no extraction AI call, and creates no
 * items.
 */
export async function testAppPasswordScanPipeline(
  supabase: SupabaseClient,
  userId: string,
): Promise<ScanPipelineTestResult | null> {
  const connection = await loadAppPasswordConnection(userId);
  if (!connection) return null;

  const profile = await getScanProfile(supabase, userId);
  const { candidates, ...steps } = await runImapScanPipeline(
    connection,
    profile.scanCategories,
  );
  const fresh = await filterAlreadyImported(supabase, userId, candidates);
  const alreadyImported = candidates
    .filter((email) => !fresh.includes(email))
    .map(toEnvelopeSummary);

  return {
    ...steps,
    ai: buildAiPreview(fresh, alreadyImported, profile),
  };
}

export type MockScanTestResult = Omit<MockScanPipelineResult, "candidates"> & {
  mockEmails: (EnvelopeSummary & { expected: string })[];
  ai: AiPreview;
  // Only filled in when the admin chose to run extraction. Nothing is saved.
  extracted: (ExtractedPurchase & { emailSubject: string })[] | null;
};

/**
 * Runs the built-in test emails (~/lib/google/mock-emails) through the same
 * filters and AI trimming as the real scan, for the admin debug tool. Uses
 * this user's saved categories and scan categories. The already-imported
 * check is skipped, since test emails are never imported. With
 * `runExtraction`, also calls the
 * extraction AI and returns what it found, without creating any items.
 */
export async function testMockScanPipeline(
  supabase: SupabaseClient,
  userId: string,
  runExtraction: boolean,
): Promise<MockScanTestResult> {
  const profile = await getScanProfile(supabase, userId);
  const { candidates, ...steps } = await runMockScanPipeline(
    MOCK_EMAILS,
    profile.scanCategories,
  );
  const extracted = runExtraction
    ? await extractInBatches(
        candidates,
        profile.itemTypes,
        allowedCategoriesFor(profile.scanCategories, profile.itemTypes),
      )
    : null;
  const subjectById = new Map(
    MOCK_EMAILS.map((email) => [email.id, email.subject]),
  );

  return {
    ...steps,
    mockEmails: MOCK_EMAILS.map((email) => ({
      ...toEnvelopeSummary(email),
      expected: email.expected,
    })),
    ai: buildAiPreview(candidates, [], profile),
    extracted:
      extracted?.map((item) => ({
        ...item,
        emailSubject: subjectById.get(item.emailId) ?? "",
      })) ?? null,
  };
}
