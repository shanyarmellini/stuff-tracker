import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireAdmin } from "~/lib/api";
import { testAppPasswordScanPipeline } from "~/lib/google/scan-app-password-purchases";
import { createAdminClient } from "~/lib/supabase/admin";
import { errorMessage } from "~/lib/utils";

const bodySchema = z.object({ userId: z.string().uuid() });

/**
 * Admin-only debug route: dry-runs the App Password scan for a given user's
 * connected inbox and returns what every step produced (envelope scan, noise
 * filter, fair sender selection) plus the exact prompt and emails that would
 * be sent to the AI. Makes no AI call and creates no items.
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid userId", 400);

  try {
    const result = await testAppPasswordScanPipeline(
      createAdminClient(),
      parsed.data.userId,
    );
    if (!result) {
      return jsonError("No Gmail App Password connected for this user", 404);
    }
    return NextResponse.json(result);
  } catch (err) {
    return jsonError(errorMessage(err), 500);
  }
}
