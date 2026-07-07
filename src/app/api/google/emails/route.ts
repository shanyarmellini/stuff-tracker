import { NextResponse } from "next/server";
import { getGmailConnection } from "~/lib/google/gmail";
import { createClient } from "~/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connection = await getGmailConnection(user.id, { limit: 10 });
  if (!connection) {
    return NextResponse.json({ connected: false });
  }

  return NextResponse.json({
    connected: true,
    email: connection.email,
    messages: connection.messages,
  });
}
