import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { extractPurchasesFromEmails } from "~/lib/ai/extractPurchases";
import { extractFirstImageUrl, stripHtml } from "~/lib/email/html";
import { LOOKS_LIKE_RAW_EMAIL, parseRawEmail } from "~/lib/email/mime";
import { createClient } from "~/lib/supabase/server";

const LOOKS_LIKE_HTML = /<[a-z][\s\S]*>/i;

const LINK_FORMAT = /^(https?:\/\/)?([^./\s]+\.)+[^./\s]{2,}(\/\S*)?$/i;

const EXTRACTION_LIMIT = 250;
const FREE_ITEMS_PER_EMAIL = 20;
const PRO_ITEMS_PER_EMAIL = 40;

function sanitizeLink(link: string | null): string | null {
  if (!link || !LINK_FORMAT.test(link.trim())) return null;
  return link.trim();
}

async function checkExtractionQuota(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, current_period_start")
    .eq("user_id", userId)
    .maybeSingle();

  const isPro =
    subscription?.status === "active" || subscription?.status === "trialing";

  let query = supabase
    .from("extraction_usage")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if (isPro && subscription?.current_period_start) {
    query = query.gte("created_at", subscription.current_period_start);
  }

  const { count } = await query;
  const used = count ?? 0;

  return { isPro, limited: used >= EXTRACTION_LIMIT, used };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { isPro, limited } = await checkExtractionQuota(supabase, user.id);
  if (limited) {
    return NextResponse.json(
      {
        error: isPro
          ? "You've used all your extractions for this billing period."
          : "You've used all 250 free extractions. Upgrade to keep going.",
        limitReached: true,
        isPro,
      },
      { status: 403 },
    );
  }

  const { text } = (await request.json()) as { text?: string };
  const trimmed = text?.trim();
  if (!trimmed) {
    return NextResponse.json(
      { error: "Paste an email's content first." },
      { status: 400 },
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("item_types")
    .eq("user_id", user.id)
    .single();

  let source = trimmed;
  let forceHtml = false;
  if (LOOKS_LIKE_RAW_EMAIL.test(trimmed)) {
    const parsed = parseRawEmail(trimmed);
    if (parsed.html) {
      source = parsed.html;
      forceHtml = true;
    } else if (parsed.text) {
      source = parsed.text;
      forceHtml = false;
    }
  }

  const isHtml = forceHtml || LOOKS_LIKE_HTML.test(source);
  const bodyText = isHtml ? stripHtml(source) : source;
  const imageUrl = isHtml ? extractFirstImageUrl(source) : null;

  const maxItemsPerEmail = isPro ? PRO_ITEMS_PER_EMAIL : FREE_ITEMS_PER_EMAIL;
  const existingCategories: string[] = profile?.item_types ?? [];

  let result: Awaited<ReturnType<typeof extractPurchasesFromEmails>>;
  try {
    result = await extractPurchasesFromEmails(
      [
        {
          id: crypto.randomUUID(),
          from: "",
          subject: "",
          bodyText: bodyText.slice(0, 12000),
          imageUrl,
        },
      ],
      maxItemsPerEmail,
      existingCategories,
    );
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      console.error("Anthropic API key is missing or invalid:", err.message);
      return NextResponse.json(
        {
          error:
            "AI isn't configured yet — check that ANTHROPIC_API_KEY is set correctly.",
        },
        { status: 500 },
      );
    }
    if (err instanceof Anthropic.RateLimitError) {
      console.error("Anthropic rate limit hit:", err.message);
      return NextResponse.json(
        { error: "AI is busy right now. Please try again in a moment." },
        { status: 500 },
      );
    }
    console.error("AI extraction failed:", err);
    return NextResponse.json(
      { error: "AI couldn't process that email. Please try again." },
      { status: 500 },
    );
  }

  await supabase.from("extraction_usage").insert({ user_id: user.id });

  const { items: extracted, truncated } = result;
  const truncationWarning = truncated
    ? isPro
      ? `This email had more items than we could extract — the Pro plan is capped at ${PRO_ITEMS_PER_EMAIL} items per email.`
      : `This email had more items than we could extract — the free plan is capped at ${FREE_ITEMS_PER_EMAIL} items per email. Upgrade to Pro for a ${PRO_ITEMS_PER_EMAIL}-item limit.`
    : null;

  if (extracted.length === 0) {
    return NextResponse.json({ added: 0, truncationWarning });
  }

  const existingTypes = existingCategories;
  const seenTypesLower = new Set(existingTypes.map((t) => t.toLowerCase()));
  const newTypes: string[] = [];

  const { data: minRow } = await supabase
    .from("items")
    .select("sort_order")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  let nextSortOrder = (minRow?.sort_order ?? 0) - 1;

  const rows = extracted.map((item) => {
    if (!seenTypesLower.has(item.category.toLowerCase())) {
      seenTypesLower.add(item.category.toLowerCase());
      newTypes.push(item.category);
    }
    return {
      user_id: user.id,
      name: item.name,
      price: item.price,
      link: sanitizeLink(item.link),
      category: item.category.toLowerCase(),
      photo_url: item.imageUrl,
      quantity: item.quantity,
      sort_order: nextSortOrder--,
      source: "manual_ai",
    };
  });

  const { data: inserted, error } = await supabase
    .from("items")
    .insert(rows)
    .select("id");

  if (error) {
    console.error("Failed to insert manually-extracted items:", error.message);
    return NextResponse.json(
      { error: "Failed to save extracted items." },
      { status: 500 },
    );
  }

  if (newTypes.length > 0) {
    await supabase
      .from("profiles")
      .update({ item_types: [...existingTypes, ...newTypes] })
      .eq("user_id", user.id);
  }

  return NextResponse.json({
    added: inserted?.length ?? 0,
    itemIds: inserted?.map((row) => row.id) ?? [],
    truncationWarning,
  });
}
