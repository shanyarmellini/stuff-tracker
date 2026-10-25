import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireAdmin } from "~/lib/api";
import {
  onboardingDetailsSchema,
  saveScanCategoriesForUser,
} from "~/lib/profile/onboarding";
import { createAdminClient } from "~/lib/supabase/admin";

const bodySchema = z.discriminatedUnion("step", [
  z.object({
    step: z.literal("categories"),
    userId: z.string().uuid(),
    categories: z.array(z.string()),
  }),
  z.object({
    step: z.literal("details"),
    userId: z.string().uuid(),
    gender: z.string().nullable(),
    age: z.string().nullable(),
  }),
]);

/**
 * Admin-only: saves the onboarding answers for any user, one step at a time,
 * the same way the real onboarding does - minus the Gmail App Password step,
 * which the user has already done. Used to try the scan filters with
 * different scan categories. Only writes scan_categories and item_types
 * (categories step) or gender and age (details step); onboarding_complete and
 * email scan consent are left as they are.
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request", 400);

  const supabase = createAdminClient();
  const body = parsed.data;

  if (body.step === "categories") {
    const result = await saveScanCategoriesForUser(
      supabase,
      body.userId,
      body.categories,
    );
    return result.ok ? NextResponse.json(result) : jsonError(result.error, 400);
  }

  const details = onboardingDetailsSchema.safeParse(body);
  if (!details.success) return jsonError("Invalid gender or age", 400);

  const { error } = await supabase.from("profiles").upsert({
    user_id: body.userId,
    gender: details.data.gender,
    age: details.data.age,
  });
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}
