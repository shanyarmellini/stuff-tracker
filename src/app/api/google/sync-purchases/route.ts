import { NextResponse } from "next/server";
import { extractPurchasesFromEmails } from "~/lib/ai/extractPurchases";
import { findPurchaseCandidateEmails } from "~/lib/google/gmail";
import { insertExtractedPurchases } from "~/lib/items/insert-extracted-purchases";
import { getPostHogClient } from "~/lib/posthog-server";
import { createAdminClient } from "~/lib/supabase/admin";
import { createClient } from "~/lib/supabase/server";

const BATCH_SIZE = 8;
const MAX_CANDIDATES_PER_SYNC = 20;

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  if (!connection) {
    return NextResponse.json({ added: 0, reason: "not_connected" });
  }

  const since = connection.purchases_synced_at
    ? new Date(connection.purchases_synced_at)
    : undefined;

  const candidates = await findPurchaseCandidateEmails(user.id, {
    since,
    limit: MAX_CANDIDATES_PER_SYNC,
  });

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

  const { data: existingRows } = await supabase
    .from("items")
    .select("gmail_message_id")
    .eq("user_id", user.id)
    .in(
      "gmail_message_id",
      candidates.map((c) => c.id),
    );
  const alreadyImported = new Set(
    (existingRows ?? []).map((row) => row.gmail_message_id),
  );
  const fresh = candidates.filter((c) => !alreadyImported.has(c.id));

  const extracted = [];
  for (let i = 0; i < fresh.length; i += BATCH_SIZE) {
    const { items } = await extractPurchasesFromEmails(
      fresh.slice(i, i + BATCH_SIZE),
    );
    extracted.push(...items);
  }

  const { added } = await insertExtractedPurchases(
    supabase,
    user.id,
    extracted,
    profile.item_types ?? [],
  );

  await markSynced();

  const posthog = getPostHogClient();
  posthog.capture({
    distinctId: user.id,
    event: "gmail_purchases_synced",
    properties: {
      items_added: added,
      candidates_found: candidates.length,
    },
  });
  await posthog.flush();

  return NextResponse.json({ added });
}
