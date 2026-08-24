import OpenAI from "openai";
import { env } from "~/env";

type RecordPurchasesTool = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
};

/**
 * Local-testing stand-in for the Anthropic call in extractPurchases.ts.
 * Ollama exposes an OpenAI-compatible /v1/chat/completions endpoint rather
 * than an Anthropic Messages-API one, so this translates the same tool
 * schema into OpenAI's function-calling shape and normalizes the response
 * back to the ToolOutput shape the rest of extractPurchases.ts expects.
 */
export async function callOllamaForPurchases<ToolOutput>(
  userMessage: string,
  tool: RecordPurchasesTool,
): Promise<ToolOutput> {
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
    tool_choice: {
      type: "function",
      function: { name: tool.name },
    },
  });

  const toolCall = response.choices[0]?.message.tool_calls?.[0];
  const rawArgs =
    toolCall?.type === "function" ? toolCall.function.arguments : null;
  if (!rawArgs) return { items: [] } as ToolOutput;

  try {
    return JSON.parse(rawArgs) as ToolOutput;
  } catch {
    return { items: [] } as ToolOutput;
  }
}
