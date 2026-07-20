import { createAnthropicClient } from "~/lib/ai/anthropic";

export type CandidateEmail = {
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

function buildRecordPurchasesTool(existingCategories: string[]) {
  const existingCategoriesNote =
    existingCategories.length > 0
      ? ` The user already has these categories: ${existingCategories.join(", ")}. Reuse one of these whenever it genuinely fits, matching case exactly - don't create a near-duplicate (e.g. "Rideshare" when "Transportation" already exists). Only create a new category when none of the existing ones fit.`
      : "";
  return {
    name: "record_purchases",
    description:
      "Record every distinct product purchased in the provided emails - do not omit or cap the count, list all of them even if there are many. Only include emails that are genuine order/purchase confirmations for a product the user bought - skip newsletters, shipping-only updates with no price, promotions, and anything that isn't a purchase. Email text may contain inline markers like \"[photo: https://...]\" - each marker is that specific product's photo, appearing right next to its name/price. When an email has multiple items, each item usually has its own nearby marker; don't reuse one item's photo for another.",
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
                type: "string",
                description:
                  "A URL to view or repurchase the item. The product photo and product name are often each wrapped in their own link right next to each other (e.g. a photo followed by '(url1)' then the name followed by '(url2)') - in that case use the URL attached to the product NAME, not the photo. Never leave this blank just because two nearby URLs make it ambiguous - always pick the name's URL.",
              },
              category: {
                type: "string",
                description: `One general category based on what the purchase actually is, not which store it came from. Any purchase that recurs on a monthly (or other regular) billing cycle - streaming, software, memberships, subscriptions boxes, etc. - goes in "Subscriptions", regardless of merchant. Any ride, rideshare, or trip charge (Uber, Lyft, taxis, transit passes, parking, gas) goes in "Transportation". Other common categories: Skincare, Makeup, Hair, Fragrance, Clothing, Electronics, Books, Fitness, Home, Food, Misc.${existingCategoriesNote} It's fine to invent a new category not in these lists if it genuinely fits the item better than any existing one.`,
              },
              image_url: {
                type: "string",
                description:
                  "The exact URL from this item's own nearby [photo: URL] marker, copied verbatim. Omit if none is nearby - never reuse another item's photo.",
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

type ToolOutput = {
  items: {
    email_id: string;
    name: string;
    price: number;
    merchant: string;
    link?: string;
    category: string;
    image_url?: string;
    quantity?: number;
  }[];
};

export type ExtractPurchasesResult = {
  items: ExtractedPurchase[];
  truncated: boolean;
};

export async function extractPurchasesFromEmails(
  emails: CandidateEmail[],
  maxItemsPerEmail = 20,
  existingCategories: string[] = [],
): Promise<ExtractPurchasesResult> {
  if (emails.length === 0) return { items: [], truncated: false };

  const client = createAnthropicClient();
  const prompt = emails
    .map(
      (email) =>
        `<email id="${email.id}">\nFrom: ${email.from}\nSubject: ${email.subject}\n\n${email.bodyText.slice(0, 12000)}\n</email>`,
    )
    .join("\n\n");

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 8192,
    tools: [buildRecordPurchasesTool(existingCategories)],
    tool_choice: { type: "tool", name: "record_purchases" },
    messages: [
      {
        role: "user",
        content: `Here are ${emails.length} emails from a user's inbox. Find every product purchase.\n\n${prompt}`,
      },
    ],
  });

  const toolUse = response.content.find(
    (block) => block.type === "tool_use" && block.name === "record_purchases",
  );
  if (toolUse?.type !== "tool_use") return { items: [], truncated: false };

  const output = toolUse.input as ToolOutput;
  const imageByEmailId = new Map(emails.map((e) => [e.id, e.imageUrl]));
  const bodyTextByEmailId = new Map(emails.map((e) => [e.id, e.bodyText]));
  const items = Array.isArray(output.items) ? output.items : [];

  const seen = new Map<string, number>();
  const countByEmailId = new Map<string, number>();
  let truncated = false;

  const finalItems = items
    .filter(
      (item) =>
        item.name && item.price > 0 && imageByEmailId.has(item.email_id),
    )
    .filter((item) => {
      const count = countByEmailId.get(item.email_id) ?? 0;
      countByEmailId.set(item.email_id, count + 1);
      if (count >= maxItemsPerEmail) {
        truncated = true;
        return false;
      }
      return true;
    })
    .map((item) => {
      // Only trust the AI's per-item image_url if it's a marker that
      // genuinely appears in that email's source text - otherwise fall back
      // to the email's single best image, but only when the email has just
      // one item: with multiple items, that single "best" image is a
      // per-email guess, so reusing it across items would show the same
      // (possibly unrelated) photo on more than one card.
      const bodyText = bodyTextByEmailId.get(item.email_id) ?? "";
      const itemImage =
        item.image_url && bodyText.includes(item.image_url)
          ? item.image_url
          : null;
      const isOnlyItemInEmail = countByEmailId.get(item.email_id) === 1;
      const quantity =
        Number.isInteger(item.quantity) && (item.quantity ?? 0) > 0
          ? (item.quantity as number)
          : 1;
      return {
        emailId: item.email_id,
        name: item.name,
        price: item.price,
        merchant: item.merchant,
        link: item.link ?? null,
        category: item.category || "Misc",
        imageUrl:
          itemImage ??
          (isOnlyItemInEmail ? imageByEmailId.get(item.email_id) : null) ??
          null,
        quantity,
      };
    })
    .reduce<ExtractedPurchase[]>((merged, item) => {
      // Some order confirmations list the exact same product as two or more
      // separate line items (e.g. split across order lines) instead of one
      // line with a quantity. The AI is asked to report an accurate quantity
      // per item, but as a safety net against it still splitting a genuine
      // duplicate into separate entries, merge same name+price items within
      // one email by summing their quantities rather than dropping the
      // extras - that would silently undercount how many were bought.
      const key = `${item.emailId}|${item.name.toLowerCase().trim()}|${item.price}`;
      const existingIndex = seen.get(key);
      if (existingIndex !== undefined) {
        const existing = merged[existingIndex];
        if (existing) existing.quantity += item.quantity;
        return merged;
      }
      seen.set(key, merged.length);
      merged.push(item);
      return merged;
    }, []);

  return { items: finalItems, truncated };
}
