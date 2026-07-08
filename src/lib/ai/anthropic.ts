import Anthropic from "@anthropic-ai/sdk";
import { env } from "~/env";

export function createAnthropicClient() {
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
}
