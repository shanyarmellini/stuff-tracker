import type { SupabaseClient } from "@supabase/supabase-js";

/** Lifetime cap on AI email extractions per user, to bound AI costs. */
export const EXTRACTION_LIMIT = 250;

export async function getExtractionsUsed(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count } = await supabase
    .from("extraction_usage")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  return count ?? 0;
}
