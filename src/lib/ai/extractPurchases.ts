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
};

const RECORD_PURCHASES_TOOL = {
  name: "record_purchases",
  description:
    "Record every distinct product purchased in the provided emails. Only include emails that are genuine order/purchase confirmations for a product the user bought - skip newsletters, shipping-only updates with no price, promotions, and anything that isn't a purchase. Email text may contain inline markers like \"[photo: https://...]\" - each marker is that specific product's photo, appearing right next to its name/price. When an email has multiple items, each item usually has its own nearby marker; don't reuse one item's photo for another.",
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
              description: "The id of the source email this item was found in",
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
              description:
                "One general category, e.g. Skincare, Makeup, Hair, Fragrance, Clothing, Electronics, Books, Fitness, Home, Misc",
            },
            image_url: {
              type: "string",
              description:
                "The exact URL from this item's own nearby [photo: URL] marker, copied verbatim. Omit if none is nearby - never reuse another item's photo.",
            },
          },
          required: ["email_id", "name", "price", "merchant", "category"],
        },
      },
    },
    required: ["items"],
  },
};

type ToolOutput = {
  items: {
    email_id: string;
    name: string;
    price: number;
    merchant: string;
    link?: string;
    category: string;
    image_url?: string;
  }[];
};

export async function extractPurchasesFromEmails(
  emails: CandidateEmail[],
): Promise<ExtractedPurchase[]> {
  if (emails.length === 0) return [];

  const client = createAnthropicClient();
  const prompt = emails
    .map(
      (email) =>
        `<email id="${email.id}">\nFrom: ${email.from}\nSubject: ${email.subject}\n\n${email.bodyText.slice(0, 12000)}\n</email>`,
    )
    .join("\n\n");

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 4096,
    tools: [RECORD_PURCHASES_TOOL],
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
  if (toolUse?.type !== "tool_use") return [];

  const output = toolUse.input as ToolOutput;
  const imageByEmailId = new Map(emails.map((e) => [e.id, e.imageUrl]));
  const bodyTextByEmailId = new Map(emails.map((e) => [e.id, e.bodyText]));
  const items = Array.isArray(output.items) ? output.items : [];

  const seen = new Set<string>();

  return items
    .filter(
      (item) =>
        item.name && item.price > 0 && imageByEmailId.has(item.email_id),
    )
    .map((item) => {
      // Only trust the AI's per-item image_url if it's a marker that
      // genuinely appears in that email's source text - otherwise fall back
      // to the email's single best image (e.g. plain single-item emails).
      const bodyText = bodyTextByEmailId.get(item.email_id) ?? "";
      const itemImage =
        item.image_url && bodyText.includes(item.image_url)
          ? item.image_url
          : null;
      return {
        emailId: item.email_id,
        name: item.name,
        price: item.price,
        merchant: item.merchant,
        link: item.link ?? null,
        category: item.category || "Misc",
        imageUrl: itemImage ?? imageByEmailId.get(item.email_id) ?? null,
      };
    })
    .filter((item) => {
      // Some order confirmations list the exact same product as two separate
      // line items (e.g. split across order lines) instead of one line with
      // a quantity - since there's no quantity field, collapse these down to
      // a single card rather than showing indistinguishable duplicates.
      const key = `${item.emailId}|${item.name.toLowerCase().trim()}|${item.price}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
