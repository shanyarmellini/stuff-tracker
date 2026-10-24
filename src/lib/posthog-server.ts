import { PostHog } from "posthog-node";
import { env } from "~/env";

type PostHogLike = Pick<PostHog, "identify" | "capture" | "flush">;

const noopPostHogClient: PostHogLike = {
  identify: () => {},
  capture: () => {},
  flush: async () => {},
};

function getPostHogClient(): PostHogLike {
  if (!env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN || !env.NEXT_PUBLIC_POSTHOG_HOST) {
    return noopPostHogClient;
  }
  return new PostHog(env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN, {
    host: env.NEXT_PUBLIC_POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0,
  });
}

type ServerEvent = {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
  /** Person properties to set via identify before capturing. */
  identify?: Record<string, unknown>;
};

export async function captureServerEvent({
  distinctId,
  event,
  properties,
  identify,
}: ServerEvent) {
  const posthog = getPostHogClient();
  if (identify) posthog.identify({ distinctId, properties: identify });
  posthog.capture({ distinctId, event, properties });
  await posthog.flush();
}
