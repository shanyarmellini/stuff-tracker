import { NextResponse } from "next/server";
import { getGmailConnection } from "~/lib/google/gmail";
import { createClient } from "~/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit")) || 25;
  const pageToken = searchParams.get("pageToken") ?? undefined;

  const connection = await getGmailConnection(user.id, { limit, pageToken });
  if (!connection) {
    return NextResponse.json({ connected: false });
  }

  return NextResponse.json({
    connected: true,
    email: connection.email,
    messages: connection.messages,
    nextPageToken: connection.nextPageToken,
  });
}
