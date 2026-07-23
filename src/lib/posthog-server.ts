import { PostHog } from "posthog-node";
import { env } from "~/env";

type PostHogLike = Pick<PostHog, "identify" | "capture" | "flush">;

const noopPostHogClient: PostHogLike = {
  identify: () => {},
  capture: () => {},
  flush: async () => {},
};

export function getPostHogClient(): PostHogLike {
  if (!env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN || !env.NEXT_PUBLIC_POSTHOG_HOST) {
    return noopPostHogClient;
  }
  return new PostHog(env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN, {
    host: env.NEXT_PUBLIC_POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0,
  });
}
