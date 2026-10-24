import { NextResponse } from "next/server";
import { jsonError, requireUser } from "~/lib/api";
import { findPurchaseCandidateEmails } from "~/lib/google/gmail";
import {
  extractInBatches,
  filterAlreadyImported,
  insertExtractedPurchases,
} from "~/lib/items/import-purchases";
import { createAdminClient } from "~/lib/supabase/admin";

const MAX_CANDIDATES_PER_SYNC = 20;

export async function POST() {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { supabase, user } = auth;

  const { data: profile } = await supabase
    .from("profiles")
    .select("email_scan_consent, item_types")
    .eq("user_id", user.id)
    .single();
  if (!profile?.email_scan_consent) {
    return NextResponse.json({ added: 0, reason: "consent_required" });
  }

  const admin = createAdminClient();
  const { data: connection } = await admin
    .from("google_connections")
    .select("purchases_synced_at")
    .eq("user_id", user.id)
    .maybeSingle();
  const candidates =
    connection &&
    (await findPurchaseCandidateEmails(user.id, {
      since: connection.purchases_synced_at
        ? new Date(connection.purchases_synced_at)
        : undefined,
      limit: MAX_CANDIDATES_PER_SYNC,
    }));
  if (!candidates) {
    return NextResponse.json({ added: 0, reason: "not_connected" });
  }

  const markSynced = () =>
    admin
      .from("google_connections")
      .update({ purchases_synced_at: new Date().toISOString() })
      .eq("user_id", user.id);

  if (candidates.length === 0) {
    await markSynced();
    return NextResponse.json({ added: 0 });
  }

  const itemTypes: string[] = profile.item_types ?? [];
  let added: number;
  try {
    const fresh = await filterAlreadyImported(supabase, user.id, candidates);
    const extracted = await extractInBatches(fresh, itemTypes);
    const insertedIds = await insertExtractedPurchases(
      supabase,
      user.id,
      extracted,
      itemTypes,
    );
    added = insertedIds.length;
  } catch (err) {
    console.error("Gmail purchase sync failed:", err);
    return jsonError("Failed to sync purchases.", 500);
  }

  await markSynced();
  return NextResponse.json({ added });
}
