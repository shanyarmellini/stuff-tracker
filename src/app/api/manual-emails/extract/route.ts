import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  extractPurchasesFromEmails,
  MAX_ITEMS_PER_EMAIL,
  type PurchaseCandidateEmail,
} from "~/lib/ai/extractPurchases";
import { jsonError, requireUser } from "~/lib/api";
import { extractFirstImageUrl, stripHtml } from "~/lib/email/html";
import { LOOKS_LIKE_RAW_EMAIL, parseRawEmail } from "~/lib/email/mime";
import {
  getItemTypes,
  insertExtractedPurchases,
} from "~/lib/items/import-purchases";
import { EXTRACTION_LIMIT, getExtractionsUsed } from "~/lib/usage";

const LOOKS_LIKE_HTML = /<[a-z][\s\S]*>/i;

const bodySchema = z.object({ text: z.string().trim().min(1) });

/** Accepts raw RFC 822 source, HTML, or plain text. */
function toCandidateEmail(pasted: string): PurchaseCandidateEmail {
  const raw = LOOKS_LIKE_RAW_EMAIL.test(pasted) ? parseRawEmail(pasted) : null;
  const source = raw?.html || raw?.text || pasted;
  const isHtml = !!raw?.html || LOOKS_LIKE_HTML.test(source);
  return {
    id: crypto.randomUUID(),
    from: "",
    subject: "",
    bodyText: isHtml ? stripHtml(source) : source,
    imageUrl: isHtml ? extractFirstImageUrl(source) : null,
  };
}

function aiErrorResponse(err: unknown) {
  if (err instanceof Anthropic.AuthenticationError) {
    console.error("ANTHROPIC_API_KEY is missing or invalid:", err.message);
    return jsonError("AI extraction is unavailable right now.", 500);
  }
  if (err instanceof Anthropic.RateLimitError) {
    console.error("Anthropic rate limit hit:", err.message);
    return jsonError(
      "AI is busy right now. Please try again in a moment.",
      429,
    );
  }
  console.error("AI extraction failed:", err);
  return jsonError("AI couldn't process that email. Please try again.", 500);
}

const TRUNCATION_WARNING = `This email had more items than we could extract — only the first ${MAX_ITEMS_PER_EMAIL} were added.`;

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { supabase, user } = auth;

  if ((await getExtractionsUsed(supabase, user.id)) >= EXTRACTION_LIMIT) {
    return jsonError(
      `You've used all ${EXTRACTION_LIMIT} AI extractions on your account.`,
      403,
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Paste an email's content first.", 400);

  const itemTypes = await getItemTypes(supabase, user.id);

  let result: Awaited<ReturnType<typeof extractPurchasesFromEmails>>;
  try {
    result = await extractPurchasesFromEmails(
      [toCandidateEmail(parsed.data.text)],
      itemTypes,
    );
  } catch (err) {
    return aiErrorResponse(err);
  }

  const { error: usageError } = await supabase
    .from("extraction_usage")
    .insert({ user_id: user.id });
  if (usageError) {
    console.error("Failed to record extraction usage:", usageError.message);
  }

  try {
    const itemIds = await insertExtractedPurchases(
      supabase,
      user.id,
      result.items,
      itemTypes,
      "manual_ai",
    );
    return NextResponse.json({
      added: itemIds.length,
      itemIds,
      truncationWarning: result.truncated ? TRUNCATION_WARNING : null,
    });
  } catch (err) {
    console.error("Failed to save manually-extracted items:", err);
    return jsonError("Failed to save extracted items.", 500);
  }
}
