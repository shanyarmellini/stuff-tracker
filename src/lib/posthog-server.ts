import { PostHog } from "posthog-node";
import { env } from "~/env";

export function getPostHogClient(): PostHog {
  return new PostHog(env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN, {
    host: env.NEXT_PUBLIC_POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0,
  });
}
