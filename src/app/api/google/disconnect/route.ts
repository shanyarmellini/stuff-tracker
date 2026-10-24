import { NextResponse } from "next/server";
import { jsonError, requireUser } from "~/lib/api";
import { createAdminClient } from "~/lib/supabase/admin";

export async function POST() {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const { error } = await createAdminClient()
    .from("google_connections")
    .delete()
    .eq("user_id", auth.user.id);
  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ success: true });
}
