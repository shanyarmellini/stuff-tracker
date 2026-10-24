"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import type { EnvelopeSummary } from "~/lib/google/gmail-app-password";
import type { ScanPipelineTestResult } from "~/lib/google/scan-app-password-purchases";
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

function PipelineResult({ result }: { result: ScanPipelineTestResult }) {
  const { envelopeScan, noiseFilter, fairSelection, ai } = result;
  const emailsSentToAi = ai.batches.reduce(
    (total, batch) => total + batch.emails.length,
    0,
  );

  return (
    <>
      <Step
        number={1}
        title="Cheap envelope scan"
        summary={`${envelopeScan.totalMatchedByKeywordQuery} matched the keyword search; the newest ${envelopeScan.considered.length} (window of ${envelopeScan.windowSize}) had their subject/sender fetched.`}
      >
        <div>
          <h4 className="mb-2 font-ui text-sm font-medium text-foreground">
            Gmail search query
          </h4>
          <CodeBlock>{envelopeScan.keywordQuery}</CodeBlock>
        </div>
        <LabeledList
          title="Envelopes considered"
          emails={envelopeScan.considered}
          emptyLabel="Nothing matched the keyword search."
        />
      </Step>

      <Step
        number={2}
        title="Regex noise filter"
        summary={`${noiseFilter.kept.length} kept · ${noiseFilter.dropped.length} dropped as marketing noise (subject-line patterns).`}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <LabeledList
            title="Kept"
            emails={noiseFilter.kept}
            emptyLabel="Nothing kept."
          />
          <LabeledList
            title="Dropped as noise"
            emails={noiseFilter.dropped}
            emptyLabel="Nothing dropped."
          />
        </div>
      </Step>

      <Step
        number={3}
        title="Fair sender selection"
        summary={`${fairSelection.selected.length} of ${noiseFilter.kept.length} picked round-robin across sender domains (cap ${fairSelection.limit}); their full bodies were fetched.`}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <LabeledList
            title="Selected (in pick order)"
            emails={fairSelection.selected}
            emptyLabel="Nothing selected."
          />
          <LabeledList
            title="Not selected (over the cap)"
            emails={fairSelection.notSelected}
            emptyLabel="Everything fit under the cap."
          />
        </div>
      </Step>

      <Step
        number={4}
        title="Sent to the AI"
        summary={`${ai.alreadyImported.length} skipped as already imported · ${emailsSentToAi} would be sent in ${ai.batches.length} ${ai.batches.length === 1 ? "batch" : "batches"} to ${ai.provider} (${ai.model}).`}
      >
        <LabeledList
          title="Skipped — already imported"
          emails={ai.alreadyImported}
          emptyLabel="None were already imported."
        />
        <div>
          <h4 className="mb-2 font-ui text-sm font-medium text-foreground">
            Prompt: tool instructions (same for every batch)
          </h4>
          <CodeBlock>{ai.tool.description}</CodeBlock>
        </div>
        <div>
          <h4 className="mb-2 font-ui text-sm font-medium text-foreground">
            Prompt: tool schema and field instructions
          </h4>
          <p className="mb-2 font-ui text-xs text-subtle-foreground">
            Existing categories passed in:{" "}
            {ai.existingCategories.length > 0
              ? ai.existingCategories.join(", ")
              : "none"}
          </p>
          <CodeBlock>{JSON.stringify(ai.tool.input_schema, null, 2)}</CodeBlock>
        </div>
        {ai.batches.length === 0 ? (
          <p className="font-ui text-sm text-subtle-foreground">
            Nothing would be sent to the AI.
          </p>
        ) : (
          ai.batches.map((batch, i) => (
            <details
              // biome-ignore lint/suspicious/noArrayIndexKey: batches are positional and never reorder
              key={i}
              className="rounded-lg border border-border p-3"
            >
              <summary className="cursor-pointer list-none font-ui text-sm font-medium text-foreground">
                Batch {i + 1} of {ai.batches.length} ({batch.emails.length}{" "}
                emails)
              </summary>
              <div className="mt-3 space-y-3">
                <SubjectList emails={batch.emails} emptyLabel="Empty batch." />
                <h4 className="font-ui text-sm font-medium text-foreground">
                  User message sent
                </h4>
                <CodeBlock>{batch.userMessage}</CodeBlock>
              </div>
            </details>
          ))
        )}
      </Step>
    </>
  );
}

export function ScanPipelineTester({ userId }: { userId: string }) {
  const [state, setState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "done"; result: ScanPipelineTestResult }
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
      const result = (await res.json()) as ScanPipelineTestResult;
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
            Runs every step of the real scan against this user's live inbox and
            shows what each one produced, up to the exact AI prompt. No AI call,
            no items created.
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
