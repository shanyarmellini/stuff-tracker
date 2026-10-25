"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import type {
  EnvelopeSummary,
  NoiseFilterDryRunResult,
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
    <ul className="max-h-80 divide-y divide-border overflow-y-auto rounded-lg border border-border">
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

function LabeledList({
  title,
  emails,
  emptyLabel,
}: {
  title: string;
  emails: EnvelopeSummary[];
  emptyLabel: string;
}) {
  return (
    <div>
      <h4 className="mb-2 font-ui text-sm font-medium text-foreground">
        {title} ({emails.length})
      </h4>
      <SubjectList emails={emails} emptyLabel={emptyLabel} />
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 font-mono text-xs text-muted-foreground">
      {children}
    </pre>
  );
}

function Step({
  number,
  title,
  summary,
  children,
}: {
  number: number;
  title: string;
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <details className="border-t border-border px-6 py-4">
      <summary className="cursor-pointer list-none">
        <h3 className="font-ui text-sm font-medium text-foreground">
          Step {number}: {title}
        </h3>
        <p className="font-ui text-xs text-subtle-foreground">
          {summary} Click to expand.
        </p>
      </summary>
      <div className="mt-4 space-y-4">{children}</div>
    </details>
  );
}

function KeptAndDropped({
  kept,
  dropped,
  keptTitle,
  droppedTitle,
}: {
  kept: EnvelopeSummary[];
  dropped: EnvelopeSummary[];
  keptTitle: string;
  droppedTitle: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <LabeledList title={keptTitle} emails={kept} emptyLabel="None." />
      <LabeledList title={droppedTitle} emails={dropped} emptyLabel="None." />
    </div>
  );
}

function PipelineResult({ result }: { result: NoiseFilterDryRunResult }) {
  const { keywordSearch, timeConstraint, subjectFilter, jevFilter } = result;

  return (
    <>
      <Step
        number={1}
        title="Keyword search"
        summary={`${keywordSearch.matchedCount} emails in all mail matched the keyword query.`}
      >
        <div>
          <h4 className="mb-2 font-ui text-sm font-medium text-foreground">
            Gmail search query
          </h4>
          <CodeBlock>{keywordSearch.query}</CodeBlock>
        </div>
      </Step>

      <Step
        number={2}
        title="Time constraint"
        summary={`${timeConstraint.matched.length} of those are from no more than ${timeConstraint.days} days before the user connected Gmail; only their subject/sender were fetched.`}
      >
        <div>
          <h4 className="mb-2 font-ui text-sm font-medium text-foreground">
            Gmail search query
          </h4>
          <CodeBlock>{timeConstraint.query}</CodeBlock>
        </div>
        <LabeledList
          title="Matched"
          emails={timeConstraint.matched}
          emptyLabel="Nothing inside the time window."
        />
      </Step>

      <Step
        number={3}
        title="Subject noise filter"
        summary={`${subjectFilter.kept.length} kept · ${subjectFilter.dropped.length} dropped because the subject reads as marketing.`}
      >
        <KeptAndDropped
          {...subjectFilter}
          keptTitle="Kept"
          droppedTitle="Dropped as marketing"
        />
      </Step>

      <Step
        number={4}
        title="Jev subject filter"
        summary={
          jevFilter.enabled
            ? `${jevFilter.kept.length} kept · ${jevFilter.dropped.length} dropped as not a purchase, judged by subject alone.`
            : "Skipped: JEV_API_KEY is not set."
        }
      >
        <KeptAndDropped
          kept={jevFilter.kept}
          dropped={jevFilter.dropped}
          keptTitle="Kept as purchase"
          droppedTitle="Dropped as not a purchase"
        />
      </Step>
    </>
  );
}

export function ScanPipelineTester({ userId }: { userId: string }) {
  const [state, setState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "done"; result: NoiseFilterDryRunResult }
  >({ status: "idle" });

  async function runScan() {
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/admin/scan-pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const { error } = (await res.json()) as { error?: string };
        setState({ status: "error", message: error ?? "Scan failed" });
        return;
      }
      const result = (await res.json()) as NoiseFilterDryRunResult;
      setState({ status: "done", result });
    } catch (err) {
      setState({ status: "error", message: errorMessage(err) });
    }
  }

  return (
    <div className="mb-6 rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <h2 className="font-display text-lg tracking-wide text-foreground">
            Test email scan
          </h2>
          <p className="font-ui text-xs text-subtle-foreground">
            Runs the start of the real scan against this user's live inbox and
            shows what each step kept, through the Jev subject filter. Makes one
            Jev call per subject that passes the regex filter. No items created.
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
        <p className="border-t border-border px-6 py-4 font-ui text-sm text-destructive">
          {state.message}
        </p>
      )}

      {state.status === "done" && <PipelineResult result={state.result} />}
    </div>
  );
}
