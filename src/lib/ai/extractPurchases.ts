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
    "Record every distinct product purchased in the provided emails. Only include emails that are genuine order/purchase confirmations for a product the user bought - skip newsletters, shipping-only updates with no price, promotions, and anything that isn't a purchase.",
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
              description: "Price paid in USD, numeric only",
            },
            merchant: {
              type: "string",
              description: "Store or brand name, e.g. Amazon, Sephora",
            },
            link: {
              type: "string",
              description:
                "A URL to view or repurchase the item, if present in the email",
            },
            category: {
              type: "string",
              description:
                "One general category, e.g. Skincare, Makeup, Hair, Fragrance, Clothing, Electronics, Books, Fitness, Home, Misc",
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
        `<email id="${email.id}">\nFrom: ${email.from}\nSubject: ${email.subject}\n\n${email.bodyText.slice(0, 6000)}\n</email>`,
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

  return (output.items ?? [])
    .filter(
      (item) =>
        item.name && item.price > 0 && imageByEmailId.has(item.email_id),
    )
    .map((item) => ({
      emailId: item.email_id,
      name: item.name,
      price: item.price,
      merchant: item.merchant,
      link: item.link ?? null,
      category: item.category || "Misc",
      imageUrl: imageByEmailId.get(item.email_id) ?? null,
    }));
}
