import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireAdmin } from "~/lib/api";
import {
  debugEnvelopeScan,
  loadAppPasswordConnection,
} from "~/lib/google/gmail-app-password";
import { errorMessage } from "~/lib/utils";

const bodySchema = z.object({ userId: z.string().uuid() });

/**
 * Admin-only debug route: runs just the cheap IMAP keyword scan (search +
 * marketing-noise filter) for a given user's connected inbox, skipping AI
 * extraction entirely. Lets the admin eyeball what the keyword scan itself
 * kept vs. dropped, separately from whether the AI pipeline works.
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid userId", 400);

  const connection = await loadAppPasswordConnection(parsed.data.userId);
  if (!connection) {
    return jsonError("No Gmail App Password connected for this user", 404);
  }

  try {
    return NextResponse.json(
      await debugEnvelopeScan(connection.email, connection.app_password),
    );
  } catch (err) {
    return jsonError(errorMessage(err), 500);
  }
}
