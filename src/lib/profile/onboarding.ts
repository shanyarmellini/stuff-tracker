import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { MAX_AGE, MIN_AGE } from "~/app/onboarding/constants";
import {
  MAX_OTHER_CATEGORY_LENGTH,
  MAX_SCAN_CATEGORIES,
  subcategoriesFor,
  toScanCategoryId,
} from "~/lib/categories/taxonomy";

// Shared by the real onboarding (server actions, signed-in user) and the
// admin mock onboarding (API route, any user).

// A listed category's id, or a typed "Other" name (see toScanCategoryId).
export const scanCategoriesSchema = z
  .array(
    z
      .string()
      .trim()
      .min(1)
      .max(MAX_OTHER_CATEGORY_LENGTH)
      .transform(toScanCategoryId),
  )
  .min(1)
  .max(MAX_SCAN_CATEGORIES)
  .transform((ids) => {
    const byLower = new Map(ids.map((id) => [id.toLowerCase(), id]));
    return [...byLower.values()];
  });

export const onboardingDetailsSchema = z.object({
  gender: z
    .string()
    .trim()
    .nullable()
    .transform((value) => value || null),
  age: z.preprocess(
    (value) => value || null,
    z.coerce.number().int().min(MIN_AGE).max(MAX_AGE).nullable(),
  ),
});

export type SaveScanCategoriesResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Saves the broad categories scanning is limited to, and seeds the
 * dashboard categories with their subcategories.
 */
export async function saveScanCategoriesForUser(
  supabase: SupabaseClient,
  userId: string,
  categories: unknown,
): Promise<SaveScanCategoriesResult> {
  const parsed = scanCategoriesSchema.safeParse(categories);
  if (!parsed.success) {
    return {
      ok: false,
      error: `Pick between 1 and ${MAX_SCAN_CATEGORIES} categories.`,
    };
  }

  const { error } = await supabase.from("profiles").upsert({
    user_id: userId,
    scan_categories: parsed.data,
    item_types: subcategoriesFor(parsed.data),
  });
  if (error) {
    console.error("Failed to save scan categories:", error);
    return { ok: false, error: "Failed to save your categories." };
  }
  return { ok: true };
}
