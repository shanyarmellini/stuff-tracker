import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireAdmin } from "~/lib/api";
import { testMockScanPipeline } from "~/lib/google/scan-app-password-purchases";
import { createAdminClient } from "~/lib/supabase/admin";
import { errorMessage } from "~/lib/utils";

const bodySchema = z.object({
  userId: z.string().uuid(),
  runExtraction: z.boolean().default(false),
});

/**
 * Admin-only debug route: runs the built-in test emails through the same
 * filters and AI trimming as the real scan, using the given user's saved
 * categories. Makes Jev calls; with `runExtraction` it also calls the
 * extraction AI and returns the items it found. Never creates items.
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request", 400);

  try {
    const result = await testMockScanPipeline(
      createAdminClient(),
      parsed.data.userId,
      parsed.data.runExtraction,
    );
    return NextResponse.json(result);
  } catch (err) {
    return jsonError(errorMessage(err), 500);
  }
}
