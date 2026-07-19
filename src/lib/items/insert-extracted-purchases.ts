import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExtractedPurchase } from "~/lib/ai/extractPurchases";

const LINK_FORMAT = /^(https?:\/\/)?([^./\s]+\.)+[^./\s]{2,}(\/\S*)?$/i;

function sanitizeLink(link: string | null): string | null {
  if (!link || !LINK_FORMAT.test(link.trim())) return null;
  return link.trim();
}

/**
 * Upserts AI-extracted purchases into `items` (de-duping on
 * `user_id,gmail_message_id,name,price` - not just the message id, since a
 * single email can contain multiple distinct products) and appends any
 * newly-seen categories to `profiles.item_types`. Shared by the Gmail OAuth
 * sync route and the Gmail App Password onboarding scan, which both feed
 * the same `extractPurchasesFromEmails` output into the same table.
 */
export async function insertExtractedPurchases(
  supabase: SupabaseClient,
  userId: string,
  extracted: ExtractedPurchase[],
  existingItemTypes: string[],
): Promise<{ added: number }> {
  if (extracted.length === 0) return { added: 0 };

  const seenTypesLower = new Set(existingItemTypes.map((t) => t.toLowerCase()));
  const newTypes: string[] = [];

  const { data: minRow } = await supabase
    .from("items")
    .select("sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  let nextSortOrder = (minRow?.sort_order ?? 0) - 1;

  const rows = extracted.map((item) => {
    if (!seenTypesLower.has(item.category.toLowerCase())) {
      seenTypesLower.add(item.category.toLowerCase());
      newTypes.push(item.category);
    }
    return {
      user_id: userId,
      name: item.name,
      price: item.price,
      link: sanitizeLink(item.link),
      category: item.category.toLowerCase(),
      photo_url: item.imageUrl,
      sort_order: nextSortOrder--,
      source: "gmail_ai",
      gmail_message_id: item.emailId,
    };
  });

  const { data: inserted, error } = await supabase
    .from("items")
    .upsert(rows, {
      onConflict: "user_id,gmail_message_id,name,price",
      ignoreDuplicates: true,
    })
    .select("id");

  if (error) {
    console.error("Failed to insert AI-detected items:", error.message);
    return { added: 0 };
  }

  if (newTypes.length > 0) {
    await supabase
      .from("profiles")
      .update({ item_types: [...existingItemTypes, ...newTypes] })
      .eq("user_id", userId);
  }

  return { added: inserted?.length ?? 0 };
}
