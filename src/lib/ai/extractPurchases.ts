import { z } from "zod";
import { env } from "~/env";
import { createAnthropicClient } from "~/lib/ai/anthropic";
import { callOllamaForPurchases } from "~/lib/ai/ollama";
import {
  type CompactedEmail,
  compactEmailForAi,
} from "~/lib/email/compact-for-ai";

const ANTHROPIC_MODEL = "claude-haiku-5-5";
const MAX_OUTPUT_TOKENS = 8192;
const MAX_EMAIL_BODY_CHARS = 12000;
const MAX_ITEMS_PER_EMAIL = 20;

export type PurchaseCandidateEmail = {
  id: string;
  from: string;
  subject: string;
  bodyText: string;
  imageUrl: string | null;
};

export type ExtractedPurchase = {
  emailId: string;
  name: string;
  price: number;
  merchant: string;
  link: string | null;
  category: string;
  imageUrl: string | null;
  quantity: number;
};

// The user's existing categories, open-ended: the AI may invent new ones.
function openCategoryProperty(existingCategories: string[]) {
  const existingCategoriesNote =
    existingCategories.length > 0
      ? ` The user already has these categories: ${existingCategories.join(", ")}. Reuse one of these whenever it genuinely fits, matching case exactly - don't create a near-duplicate (e.g. "Rideshare" when "Transportation" already exists). Only create a new category when none of the existing ones fit.`
      : "";
  return {
    type: "string",
    description: `One general category based on what the purchase actually is, not which store it came from. Any purchase that recurs on a monthly (or other regular) billing cycle - streaming, software, memberships, subscriptions boxes, etc. - goes in "Subscriptions", regardless of merchant. Any ride, rideshare, or trip charge (Uber, Lyft, taxis, transit passes, parking, gas) goes in "Transportation". Other common categories: Skincare, Makeup, Hair, Fragrance, Clothing, Electronics, Books, Fitness, Home, Food, Misc.${existingCategoriesNote} It's fine to invent a new category not in these lists if it genuinely fits the item better than any existing one.`,
  };
}

// The user limited scanning to these categories: nothing else may be used.
function allowedCategoryProperty(allowedCategories: string[]) {
  return {
    type: "string",
    enum: allowedCategories,
    description:
      "The one category from this list that best fits what the item actually is, not which store it came from.",
  };
}

const BASE_TOOL_DESCRIPTION =
  "Record every distinct product purchased in the provided emails - do not omit or cap the count, list all of them even if there are many. Only include emails that are genuine order/purchase confirmations for a product the user bought - skip newsletters, shipping-only updates with no price, promotions, and anything that isn't a purchase. Email text has been shortened: product photos appear as \"[photo N]\" markers and links as \"[link N]\" markers, numbered separately within each email. Each [photo N] marker is that specific product's photo, appearing right next to its name/price. When an email has multiple items, each item usually has its own nearby photo marker; don't reuse one item's photo for another. A [link N] marker comes right after the text or photo it is attached to.";

const ALLOWED_CATEGORIES_NOTE =
  ' The user only tracks items that fit one of the categories allowed in the category field. Skip every item that doesn\'t clearly fit one of them, even when the same order also contains items that do fit. A ride, trip, or food order counts as a purchase like a product when its category is allowed: record it as one item named after what it was (e.g. "Uber ride", "DoorDash order from Sweetgreen").';

function buildRecordPurchasesTool(
  existingCategories: string[],
  allowedCategories: string[],
) {
  const limited = allowedCategories.length > 0;
  return {
    name: "record_purchases",
    description: limited
      ? BASE_TOOL_DESCRIPTION + ALLOWED_CATEGORIES_NOTE
      : BASE_TOOL_DESCRIPTION,
    input_schema: {
      type: "object" as const,
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              email_id: {
                type: "string",
                description:
                  "The id of the source email this item was found in",
              },
              name: { type: "string", description: "Short product name" },
              price: {
                type: "number",
                description:
                  "The actual price paid for this item, excluding tax and shipping, numeric only. Start with the FIRST price shown next to the item's name (never a crossed-out/strikethrough price, and never a separate 'Item Price:' line elsewhere - those are pre-discount reference prices). Then check the order summary/totals section: if it separately lists a 'Discount' amount (e.g. 'Discount: $150.00'), that discount is NOT yet reflected in the item's price above - you MUST subtract it. Example: item price is $449.99, order summary shows 'Discount: $150.00' -> the price you report is 449.99 - 150.00 = 299.99. Never report the order's tax-inclusive total as the item price.",
              },
              merchant: {
                type: "string",
                description: "Store or brand name, e.g. Amazon, Sephora",
              },
              link: {
                type: "integer",
                description:
                  "The number N of the [link N] marker to view or repurchase the item. The product photo and product name are often each followed by their own link marker right next to each other (e.g. '[photo 2] [link 3] Product Name [link 4]') - in that case use the link right after the product NAME ([link 4]), not the photo's. Never leave this blank just because two nearby links make it ambiguous - always pick the name's link. Omit only if the item has no nearby link marker.",
              },
              category: limited
                ? allowedCategoryProperty(allowedCategories)
                : openCategoryProperty(existingCategories),
              photo: {
                type: "integer",
                description:
                  "The number N of this item's own nearby [photo N] marker. Omit if none is nearby - never reuse another item's photo.",
              },
              quantity: {
                type: "integer",
                description:
                  "How many of this exact item were purchased, as a single number - e.g. an explicit 'Qty: 3' or '3x' next to the item, or the same product listed as several separate identical line items (same name and same per-unit price) within one order. Count carefully and only combine line items that are genuinely identical (same name AND same price) - two different rides or products that happen to cost the same must NOT be merged. Default to 1 when there's no indication of more than one.",
              },
            },
            required: ["email_id", "name", "price", "merchant", "category"],
          },
        },
      },
      required: ["items"],
    },
  };
}

// Model output is untrusted: each item is validated on its own so one
// malformed entry is dropped instead of failing the whole batch.
const toolItemSchema = z.object({
  email_id: z.string(),
  name: z.string().min(1),
  price: z.coerce.number().positive(),
  merchant: z.string().catch(""),
  link: z.coerce.number().int().positive().nullish().catch(null),
  category: z.string().min(1).catch("Misc"),
  photo: z.coerce.number().int().positive().nullish().catch(null),
  quantity: z.number().int().positive().catch(1),
});
type ToolItem = z.infer<typeof toolItemSchema>;

function parseToolItems(output: unknown): ToolItem[] {
  const parsed = z.object({ items: z.array(z.unknown()) }).safeParse(output);
  if (!parsed.success) return [];
  return parsed.data.items.flatMap((item) => {
    const result = toolItemSchema.safeParse(item);
    return result.success ? [result.data] : [];
  });
}

async function callAnthropicForPurchases(
  userMessage: string,
  tool: ReturnType<typeof buildRecordPurchasesTool>,
): Promise<unknown> {
  const response = await createAnthropicClient().messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    tools: [tool],
    tool_choice: { type: "tool", name: tool.name },
    messages: [{ role: "user", content: userMessage }],
  });
  // Safety classifiers can decline a batch (HTTP 200, no tool call). There is
  // no server-side fallback for this model, so the batch yields no items.
  if (response.stop_reason === "refusal") {
    console.warn(
      "Purchase extraction batch was declined:",
      response.stop_details?.category ?? "no category",
    );
    return null;
  }
  const toolUse = response.content.find(
    (block) => block.type === "tool_use" && block.name === tool.name,
  );
  return toolUse?.type === "tool_use" ? toolUse.input : null;
}

type PreparedEmail = PurchaseCandidateEmail & { compacted: CompactedEmail };

function prepareForAi(emails: PurchaseCandidateEmail[]): PreparedEmail[] {
  return emails.map((email) => ({
    ...email,
    compacted: compactEmailForAi(email.bodyText),
  }));
}

function renderUserMessage(
  emails: { id: string; from: string; subject: string; text: string }[],
): string {
  const emailBlocks = emails
    .map(
      (email) =>
        `<email id="${email.id}">\nFrom: ${email.from}\nSubject: ${email.subject}\n\n${email.text.slice(0, MAX_EMAIL_BODY_CHARS)}\n</email>`,
    )
    .join("\n\n");
  return `Here are ${emails.length} emails from a user's inbox. Find every product purchase.\n\n${emailBlocks}`;
}

export type ExtractionBatchPreview = {
  userMessage: string;
  // Length of the message as it would be without trimming, for comparison.
  charsBeforeTrimming: number;
  // Emails still cut off at MAX_EMAIL_BODY_CHARS after trimming.
  truncatedEmails: number;
};

/**
 * Exactly what `extractPurchasesFromEmails` sends as the user message for
 * this batch, plus size stats. Used by the admin scan debug tool.
 */
export function previewExtractionBatch(
  emails: PurchaseCandidateEmail[],
): ExtractionBatchPreview {
  const prepared = prepareForAi(emails);
  return {
    userMessage: renderUserMessage(
      prepared.map((email) => ({ ...email, text: email.compacted.text })),
    ),
    charsBeforeTrimming: renderUserMessage(
      emails.map((email) => ({ ...email, text: email.bodyText })),
    ).length,
    truncatedEmails: prepared.filter(
      (email) => email.compacted.text.length > MAX_EMAIL_BODY_CHARS,
    ).length,
  };
}

export type PurchaseExtractionRequest = {
  provider: typeof env.AI_PROVIDER;
  model: string;
  tool: ReturnType<typeof buildRecordPurchasesTool>;
};

/**
 * The provider, model and tool (instructions + schema) that
 * `extractPurchasesFromEmails` sends with every batch; pair with
 * `previewExtractionBatch` for the per-batch part. Used by the admin scan
 * debug tool.
 */
export function describePurchaseExtractionRequest(
  existingCategories: string[],
  allowedCategories: string[] = [],
): PurchaseExtractionRequest {
  return {
    provider: env.AI_PROVIDER,
    model: env.AI_PROVIDER === "ollama" ? env.OLLAMA_MODEL : ANTHROPIC_MODEL,
    tool: buildRecordPurchasesTool(existingCategories, allowedCategories),
  };
}

/**
 * Keeps only items in an allowed category, spelled exactly as allowed. The
 * tool schema already limits the category, but model output is untrusted.
 * An empty list allows everything.
 */
function keepAllowedCategories(
  items: ToolItem[],
  allowedCategories: string[],
): ToolItem[] {
  if (allowedCategories.length === 0) return items;
  const byLower = new Map(allowedCategories.map((c) => [c.toLowerCase(), c]));
  return items.flatMap((item) => {
    const category = byLower.get(item.category.toLowerCase());
    return category ? [{ ...item, category }] : [];
  });
}

function toExtractedPurchase(
  item: ToolItem,
  email: PreparedEmail,
  isOnlyItemInEmail: boolean,
): ExtractedPurchase {
  // The AI answers with marker numbers; map them back to that email's real
  // URLs (an out-of-range number maps to nothing). Without a per-item photo,
  // fall back to the email's single best image, but only when the email has
  // just one item: with multiple items, that "best" image is a per-email
  // guess, so reusing it across items would show the same (possibly
  // unrelated) photo on more than one card.
  const itemImage = item.photo
    ? (email.compacted.photos[item.photo - 1] ?? null)
    : null;
  const itemLink = item.link
    ? (email.compacted.links[item.link - 1] ?? null)
    : null;
  return {
    emailId: item.email_id,
    name: item.name,
    price: item.price,
    merchant: item.merchant,
    link: itemLink,
    category: item.category,
    imageUrl: itemImage ?? (isOnlyItemInEmail ? email.imageUrl : null),
    quantity: item.quantity,
  };
}

// Some order confirmations list the exact same product as separate line
// items instead of one line with a quantity. As a safety net against the AI
// still splitting a genuine duplicate, merge same name+price items within one
// email by summing quantities - dropping the extras would undercount.
function mergeDuplicates(items: ExtractedPurchase[]): ExtractedPurchase[] {
  const byKey = new Map<string, ExtractedPurchase>();
  for (const item of items) {
    const key = `${item.emailId}|${item.name.toLowerCase().trim()}|${item.price}`;
    const existing = byKey.get(key);
    if (existing) existing.quantity += item.quantity;
    else byKey.set(key, item);
  }
  return [...byKey.values()];
}

/**
 * With `allowedCategories`, every item is put in one of them and items that
 * fit none are skipped; without, the AI picks or invents a category.
 */
export async function extractPurchasesFromEmails(
  emails: PurchaseCandidateEmail[],
  existingCategories: string[] = [],
  allowedCategories: string[] = [],
): Promise<ExtractedPurchase[]> {
  if (emails.length === 0) return [];

  const tool = buildRecordPurchasesTool(existingCategories, allowedCategories);
  const prepared = prepareForAi(emails);
  const userMessage = renderUserMessage(
    prepared.map((email) => ({ ...email, text: email.compacted.text })),
  );
  const output =
    env.AI_PROVIDER === "ollama"
      ? await callOllamaForPurchases(userMessage, tool)
      : await callAnthropicForPurchases(userMessage, tool);

  const emailsById = new Map(prepared.map((email) => [email.id, email]));
  const valid = keepAllowedCategories(
    parseToolItems(output),
    allowedCategories,
  ).filter((item) => emailsById.has(item.email_id));

  const totalByEmailId = new Map<string, number>();
  const capped = valid.filter((item) => {
    const count = (totalByEmailId.get(item.email_id) ?? 0) + 1;
    totalByEmailId.set(item.email_id, count);
    return count <= MAX_ITEMS_PER_EMAIL;
  });

  const items = capped.map((item) =>
    toExtractedPurchase(
      item,
      emailsById.get(item.email_id) as PreparedEmail,
      totalByEmailId.get(item.email_id) === 1,
    ),
  );
  return mergeDuplicates(items);
}
