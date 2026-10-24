"use client";

import { useEffect, useRef } from "react";
import { scanConnectedGmailForItems } from "./actions";

export function ScanningStep({ onDone }: { onDone: () => void }) {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // The action already handles scan failures, but the request itself can
    // still fail (network error, function timeout) - never leave the user
    // stuck on this spinner.
    scanConnectedGmailForItems()
      .catch((err) =>
        console.error("Gmail scan failed during onboarding:", err),
      )
      .finally(onDone);
  }, [onDone]);

  return (
    <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-10 text-center shadow-sm">
      <div className="mx-auto mb-6 h-10 w-10 animate-spin rounded-full border-4 border-border border-t-brand" />
      <h1 className="mb-1 font-display text-2xl tracking-wide text-foreground">
        Getting everything set up for you
      </h1>
      <p className="font-ui text-sm text-subtle-foreground">
        We&apos;re scanning your inbox for past purchases. This only takes a
        moment.
      </p>
    </div>
  );
}
