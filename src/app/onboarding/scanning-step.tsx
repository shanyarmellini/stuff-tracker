"use client";

import { useEffect, useRef } from "react";
import { scanConnectedGmailForItems } from "./actions";

export function ScanningStep({ onDone }: { onDone: () => void }) {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    scanConnectedGmailForItems()
      .catch((err) => {
        console.error("Gmail scan failed during onboarding:", err);
        return { added: 0 };
      })
      .then(() => onDone());
  }, [onDone]);

  return (
    <div className="w-full max-w-lg rounded-3xl border border-sky-100 bg-white p-10 text-center shadow-sm">
      <div className="mx-auto mb-6 h-10 w-10 animate-spin rounded-full border-4 border-sky-100 border-t-sky-400" />
      <h1 className="mb-1 font-display text-2xl tracking-wide text-slate-800">
        Getting everything set up for you
      </h1>
      <p className="font-ui text-sm text-slate-400">
        We&apos;re scanning your inbox for past purchases. This only takes a
        moment.
      </p>
    </div>
  );
}
