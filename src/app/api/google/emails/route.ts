import { NextResponse } from "next/server";
import { requireUser } from "~/lib/api";
import { listRecentGmailMessages } from "~/lib/google/gmail";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 50;

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const requested = Math.floor(Number(searchParams.get("limit")));
  const limit = requested > 0 ? Math.min(requested, MAX_LIMIT) : DEFAULT_LIMIT;
  const pageToken = searchParams.get("pageToken") ?? undefined;

  const recent = await listRecentGmailMessages(auth.user.id, {
    limit,
    pageToken,
  });
  if (!recent) return NextResponse.json({ connected: false });

  return NextResponse.json({ connected: true, ...recent });
}
