import OpenAI from "openai";
import { env } from "~/env";

type RecordPurchasesTool = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
};

/**
 * Local-testing stand-in for the Anthropic call in extractPurchases.ts.
 * Ollama exposes an OpenAI-compatible endpoint rather than the Anthropic
 * Messages API, so this translates the same tool schema into OpenAI's
 * function-calling shape. Returns the raw tool arguments (or null) for the
 * caller to validate.
 */
export async function callOllamaForPurchases(
  userMessage: string,
  tool: RecordPurchasesTool,
): Promise<unknown> {
  const client = new OpenAI({
    baseURL: `${env.OLLAMA_BASE_URL}/v1`,
    apiKey: "ollama",
  });

  const response = await client.chat.completions.create({
    model: env.OLLAMA_MODEL,
    messages: [{ role: "user", content: userMessage }],
    tools: [
      {
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.input_schema,
        },
      },
    ],
    tool_choice: { type: "function", function: { name: tool.name } },
  });

  const toolCall = response.choices[0]?.message.tool_calls?.[0];
  if (toolCall?.type !== "function") return null;
  try {
    return JSON.parse(toolCall.function.arguments);
  } catch {
    return null;
  }
}
