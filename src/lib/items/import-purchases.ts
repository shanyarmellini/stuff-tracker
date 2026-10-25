import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type ExtractedPurchase,
  extractPurchasesFromEmails,
  type PurchaseCandidateEmail,
} from "~/lib/ai/extractPurchases";

const EMAILS_PER_AI_BATCH = 8;

const LINK_FORMAT = /^(https?:\/\/)?([^./\s]+\.)+[^./\s]{2,}(\/\S*)?$/i;

function sanitizeLink(link: string | null): string | null {
  if (!link) return null;
  const trimmed = link.trim();
  if (!LINK_FORMAT.test(trimmed)) {
    console.warn("Dropping malformed item link from AI extraction:", trimmed);
    return null;
  }
  return trimmed;
}

/** The user's saved categories (`profiles.item_types`), or [] if unset. */
export async function getItemTypes(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from("profiles")
    .select("item_types")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.item_types ?? [];
}

/** Drops candidates whose Gmail message already produced items. */
export async function filterAlreadyImported(
  supabase: SupabaseClient,
  userId: string,
  candidates: PurchaseCandidateEmail[],
): Promise<PurchaseCandidateEmail[]> {
  if (candidates.length === 0) return [];
  const { data, error } = await supabase
    .from("items")
    .select("gmail_message_id")
    .eq("user_id", userId)
    .in(
      "gmail_message_id",
      candidates.map((c) => c.id),
    );
  if (error) throw new Error(`Failed to load imported items: ${error.message}`);
  const imported = new Set(data.map((row) => row.gmail_message_id));
  return candidates.filter((c) => !imported.has(c.id));
}

/** Splits emails into the fixed-size batches each AI call receives. */
export function splitIntoAiBatches(
  emails: PurchaseCandidateEmail[],
): PurchaseCandidateEmail[][] {
  const batches: PurchaseCandidateEmail[][] = [];
  for (let i = 0; i < emails.length; i += EMAILS_PER_AI_BATCH) {
    batches.push(emails.slice(i, i + EMAILS_PER_AI_BATCH));
  }
  return batches;
}

/**
 * Runs AI extraction over the emails in fixed-size batches. Batches run
 * concurrently: each is an independent AI call, and callers are serverless
 * functions with a wall-clock budget.
 */
export async function extractInBatches(
  emails: PurchaseCandidateEmail[],
  existingCategories: string[],
): Promise<ExtractedPurchase[]> {
  const results = await Promise.all(
    splitIntoAiBatches(emails).map((batch) =>
      extractPurchasesFromEmails(batch, existingCategories),
    ),
  );
  return results.flat();
}

async function nextTopSortOrder(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("items")
    .select("sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data?.sort_order ?? 0) - 1;
}

async function appendNewCategories(
  supabase: SupabaseClient,
  userId: string,
  existingItemTypes: string[],
  extracted: ExtractedPurchase[],
  insertedCategories: Set<string>,
) {
  const known = new Set(existingItemTypes.map((t) => t.toLowerCase()));
  const newTypes: string[] = [];
  for (const { category } of extracted) {
    const lower = category.toLowerCase();
    if (insertedCategories.has(lower) && !known.has(lower)) {
      known.add(lower);
      newTypes.push(category);
    }
  }
  if (newTypes.length === 0) return;

  const { error } = await supabase
    .from("profiles")
    .update({ item_types: [...existingItemTypes, ...newTypes] })
    .eq("user_id", userId);
  if (error) console.error("Failed to add new item types:", error.message);
}

/**
 * Inserts AI-extracted purchases into `items` and appends any newly-seen
 * categories to `profiles.item_types`. Items de-dupe on
 * `user_id,gmail_message_id,name,price` (not just the message id, since one
 * email can contain several products). Returns the ids of the rows actually inserted and
 * throws on a database error.
 */
export async function insertExtractedPurchases(
  supabase: SupabaseClient,
  userId: string,
  extracted: ExtractedPurchase[],
  existingItemTypes: string[],
): Promise<string[]> {
  if (extracted.length === 0) return [];

  const topSortOrder = await nextTopSortOrder(supabase, userId);
  const rows = extracted.map((item, index) => ({
    user_id: userId,
    name: item.name,
    price: item.price,
    link: sanitizeLink(item.link),
    category: item.category.toLowerCase(),
    photo_url: item.imageUrl,
    quantity: item.quantity,
    sort_order: topSortOrder - index,
    source: "gmail_ai",
    gmail_message_id: item.emailId,
  }));

  const { data: inserted, error } = await supabase
    .from("items")
    .upsert(rows, {
      onConflict: "user_id,gmail_message_id,name,price",
      ignoreDuplicates: true,
    })
    .select("id, category");
  if (error) {
    throw new Error(`Failed to insert extracted items: ${error.message}`);
  }

  await appendNewCategories(
    supabase,
    userId,
    existingItemTypes,
    extracted,
    new Set(inserted.map((row) => row.category)),
  );
  return inserted.map((row) => row.id);
}
