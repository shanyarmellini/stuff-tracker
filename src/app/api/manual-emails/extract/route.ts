import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { extractPurchasesFromEmails } from "~/lib/ai/extractPurchases";
import { extractFirstImageUrl, stripHtml } from "~/lib/email/html";
import { createClient } from "~/lib/supabase/server";

const LOOKS_LIKE_HTML = /<[a-z][\s\S]*>/i;

const LINK_FORMAT = /^(https?:\/\/)?([^./\s]+\.)+[^./\s]{2,}(\/\S*)?$/i;

function sanitizeLink(link: string | null): string | null {
  if (!link || !LINK_FORMAT.test(link.trim())) return null;
  return link.trim();
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const isHtml = LOOKS_LIKE_HTML.test(trimmed);
  const bodyText = isHtml ? stripHtml(trimmed) : trimmed;
  const imageUrl = isHtml ? extractFirstImageUrl(trimmed) : null;

  let extracted: Awaited<ReturnType<typeof extractPurchasesFromEmails>>;
  try {
    extracted = await extractPurchasesFromEmails([
      {
        id: crypto.randomUUID(),
        from: "",
        subject: "",
        bodyText: bodyText.slice(0, 12000),
        imageUrl,
      },
    ]);
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

  if (extracted.length === 0) {
    return NextResponse.json({ added: 0 });
  }

  const existingTypes: string[] = profile?.item_types ?? [];
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
  });
}
