"use client";

import posthog from "posthog-js";
import { useEffect } from "react";
import { useSettings } from "~/lib/use-settings";

export function SettingsEffects() {
  const { settings, loaded } = useSettings();

  // PostHog is only initialized when a project token is configured (see
  // instrumentation-client.ts). Only toggle on an actual change, since
  // opt_in_capturing() itself sends an event.
  useEffect(() => {
    if (!loaded || !posthog.__loaded) return;
    const optedOut = posthog.has_opted_out_capturing();
    if (settings.dataSharing && optedOut) posthog.opt_in_capturing();
    if (!settings.dataSharing && !optedOut) posthog.opt_out_capturing();
  }, [loaded, settings.dataSharing]);

  return null;
}
