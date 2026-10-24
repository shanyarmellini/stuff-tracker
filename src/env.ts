import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    GOOGLE_OAUTH_REDIRECT_URI: z.string().url(),
    ANTHROPIC_API_KEY: z.string().min(1),
    // Dev-only local testing flags - see .env.example. Both default off, so
    // production behavior is unaffected unless explicitly opted in.
    AI_PROVIDER: z.enum(["anthropic", "ollama"]).default("anthropic"),
    OLLAMA_BASE_URL: z.string().url().default("http://localhost:11434"),
    OLLAMA_MODEL: z.string().default("qwen2.5:7b"),
    MOCK_GMAIL: z.enum(["true", "false"]).default("false"),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: z.string().min(1).optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN:
      process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_OAUTH_REDIRECT_URI: process.env.GOOGLE_OAUTH_REDIRECT_URI,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    AI_PROVIDER: process.env.AI_PROVIDER,
    OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
    OLLAMA_MODEL: process.env.OLLAMA_MODEL,
    MOCK_GMAIL: process.env.MOCK_GMAIL,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
