"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import type {
  EnvelopeScanDebugResult,
  EnvelopeSummary,
} from "~/lib/google/gmail-app-password";
import { errorMessage } from "~/lib/utils";

function SubjectList({
  emails,
  emptyLabel,
}: {
  emails: EnvelopeSummary[];
  emptyLabel: string;
}) {
  if (emails.length === 0) {
    return (
      <p className="font-ui text-sm text-subtle-foreground">{emptyLabel}</p>
    );
  }
  return (
    <ul className="max-h-80 divide-y divide-border overflow-y-auto">
      {emails.map((email, i) => (
        <li
          // biome-ignore lint/suspicious/noArrayIndexKey: subjects aren't unique and this list never reorders
          key={i}
          className="px-4 py-2 font-ui text-sm text-foreground"
        >
          <span className="font-medium">{email.subject || "(no subject)"}</span>{" "}
          <span className="text-subtle-foreground">— {email.from}</span>
        </li>
      ))}
    </ul>
  );
}

export function EnvelopeScanTester({ userId }: { userId: string }) {
  const [state, setState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "done"; result: EnvelopeScanDebugResult }
  >({ status: "idle" });

  async function runScan() {
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/admin/envelope-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const { error } = (await res.json()) as { error?: string };
        setState({ status: "error", message: error ?? "Scan failed" });
        return;
      }
      const result = (await res.json()) as EnvelopeScanDebugResult;
      setState({ status: "done", result });
    } catch (err) {
      setState({ status: "error", message: errorMessage(err) });
    }
  }

  return (
    <div className="mb-6 rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h2 className="font-display text-lg tracking-wide text-foreground">
            Test envelope scan
          </h2>
          <p className="font-ui text-xs text-subtle-foreground">
            Runs just the keyword search + noise filter against this user's live
            inbox. No AI call, no items created.
          </p>
        </div>
        <Button
          type="button"
          onClick={runScan}
          disabled={state.status === "loading"}
          className="shrink-0 rounded-full font-ui"
        >
          {state.status === "loading" ? "Scanning…" : "Run now"}
        </Button>
      </div>

      {state.status === "error" && (
        <p className="px-6 py-4 font-ui text-sm text-destructive">
          {state.message}
        </p>
      )}

      {state.status === "done" && (
        <div className="px-6 py-4">
          <p className="mb-4 font-ui text-xs text-subtle-foreground">
            {state.result.totalMatchedByKeywordQuery} matched the keyword search
            · {state.result.consideredInWindow} considered in the most recent
            window · {state.result.keptAfterNoiseFilter.length} kept ·{" "}
            {state.result.droppedAsNoise.length} dropped as noise
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 font-ui text-sm font-medium text-foreground">
                Kept
              </h3>
              <SubjectList
                emails={state.result.keptAfterNoiseFilter}
                emptyLabel="Nothing kept."
              />
            </div>
            <div>
              <h3 className="mb-2 font-ui text-sm font-medium text-foreground">
                Dropped as noise
              </h3>
              <SubjectList
                emails={state.result.droppedAsNoise}
                emptyLabel="Nothing dropped."
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
