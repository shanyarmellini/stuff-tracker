"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import type {
  EnvelopeSummary,
  JevFailure,
} from "~/lib/google/gmail-app-password";
import type {
  MockScanTestResult,
  ScanPipelineTestResult,
} from "~/lib/google/scan-app-password-purchases";
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

function formatDuration(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function Step({
  number,
  title,
  durationMs,
  summary,
  children,
}: {
  number: number;
  title: string;
  durationMs: number;
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <details className="border-t border-border px-6 py-4">
      <summary className="cursor-pointer list-none">
        <h3 className="font-ui text-sm font-medium text-foreground">
          Step {number}: {title}{" "}
          <span className="font-normal text-subtle-foreground">
            · {formatDuration(durationMs)}
          </span>
        </h3>
        <p className="font-ui text-xs text-subtle-foreground">
          {summary} Click to expand.
        </p>
      </summary>
      <div className="mt-4 space-y-4">{children}</div>
    </details>
  );
}

function JevFailures({ failures }: { failures: JevFailure[] }) {
  if (failures.length === 0) return null;
  return (
    <div>
      <h4 className="mb-2 font-ui text-sm font-medium text-destructive">
        Failed or timed out ({failures.length}) — kept without a Jev answer
      </h4>
      <ul className="max-h-80 divide-y divide-border overflow-y-auto rounded-lg border border-border">
        {failures.map((failure, i) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: failures never reorder
            key={i}
            className="px-4 py-2 font-ui text-sm text-foreground"
          >
            <span className="font-medium">
              {failure.subject || "(no subject)"}
            </span>{" "}
            <span className="text-subtle-foreground">— {failure.reason}</span>
          </li>
        ))}
      </ul>
    </div>
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

function PipelineResult({ result }: { result: ScanPipelineTestResult }) {
  const { dateLimit, keywordSearch, bodyFilter, timings } = result;

  return (
    <>
      <div className="border-t border-border px-6 py-4">
        <p className="font-ui text-sm text-foreground">
          <span className="font-display text-2xl">
            {bodyFilter.kept.length}
          </span>{" "}
          emails left after every filter. These go on to Claude (minus any
          already imported) - see step 9 for exactly what is sent.
        </p>
        <p className="font-ui text-xs text-subtle-foreground">
          Took {formatDuration(timings.total)} in total, including{" "}
          {formatDuration(timings.connect)} to connect to Gmail.
        </p>
      </div>

      <Step
        number={1}
        title="Date limit"
        durationMs={timings.dateLimit}
        summary={`${dateLimit.matchedCount} emails in all mail are from no more than ${dateLimit.days} days before the user connected Gmail (count only).`}
      >
        <div>
          <h4 className="mb-2 font-ui text-sm font-medium text-foreground">
            Gmail search query
          </h4>
          <CodeBlock>{dateLimit.query}</CodeBlock>
        </div>
      </Step>

      <Step
        number={2}
        title="Keyword search"
        durationMs={timings.keywordSearch}
        summary={`${keywordSearch.matched.length} of those match the purchase keywords; only their subject/sender were fetched.`}
      >
        <div>
          <h4 className="mb-2 font-ui text-sm font-medium text-foreground">
            Gmail search query
          </h4>
          <CodeBlock>{keywordSearch.query}</CodeBlock>
        </div>
        <LabeledList
          title="Matched"
          emails={keywordSearch.matched}
          emptyLabel="Nothing matched the keyword search."
        />
      </Step>

      <FilterSteps result={result} firstNumber={3} downloaded />

      <AiStep number={9} ai={result.ai} alreadyImportedChecked />
    </>
  );
}

// The filter steps the real scan and the test-email scan share.
type FilterStepsData = Pick<
  MockScanTestResult,
  | "subjectFilter"
  | "jevFilter"
  | "dedupe"
  | "bodyFilter"
  | "keywordFilter"
  | "contentFilter"
  | "timings"
>;

function FilterSteps({
  result,
  firstNumber,
  downloaded,
}: {
  result: FilterStepsData;
  firstNumber: number;
  // False for test emails, which already have their bodies.
  downloaded: boolean;
}) {
  const {
    subjectFilter,
    jevFilter,
    dedupe,
    bodyFilter,
    keywordFilter,
    contentFilter,
    timings,
  } = result;
  const limited = keywordFilter.scanCategories.length > 0;
  return (
    <>
      <Step
        number={firstNumber}
        title="Subject noise filter"
        durationMs={timings.subjectFilter}
        summary={`${subjectFilter.kept.length} kept · ${subjectFilter.dropped.length} dropped because the subject reads as marketing.`}
      >
        <KeptAndDropped
          {...subjectFilter}
          keptTitle="Kept"
          droppedTitle="Dropped as marketing"
        />
      </Step>

      <Step
        number={firstNumber + 1}
        title="Jev subject filter"
        durationMs={timings.jevFilter}
        summary={
          jevFilter.enabled
            ? `${jevFilter.kept.length} kept · ${jevFilter.dropped.length} dropped as not a purchase, judged by subject line alone. ${jevFilter.uniqueSubjects} Jev calls for ${subjectFilter.kept.length} emails (identical subjects are asked once). ${jevFilter.failures.length} calls failed or timed out; those emails were kept.`
            : "Skipped: JEV_API_KEY is not set."
        }
      >
        <JevFailures failures={jevFilter.failures} />
        <KeptAndDropped
          kept={jevFilter.kept}
          dropped={jevFilter.dropped}
          keptTitle="Kept as purchase"
          droppedTitle="Dropped as not a purchase"
        />
      </Step>

      <Step
        number={firstNumber + 2}
        title="Remove duplicates"
        durationMs={timings.dedupe}
        summary={`${dedupe.kept.length} kept · ${dedupe.dropped.length} dropped as a later email for an order already kept (same sender and order number in the subject).`}
      >
        <KeptAndDropped
          kept={dedupe.kept}
          dropped={dedupe.dropped.map(({ subject, from, orderNumber }) => ({
            subject,
            from: `${from} · order ${orderNumber}`,
          }))}
          keptTitle="Kept"
          droppedTitle="Dropped as duplicate"
        />
      </Step>

      <Step
        number={firstNumber + 3}
        title="Body price filter"
        durationMs={timings.download + timings.bodyFilter}
        summary={`${downloaded ? `Downloaded ${dedupe.kept.length} full emails in ${formatDuration(timings.download)}, then ` : ""}${bodyFilter.kept.length} kept · ${bodyFilter.dropped.length} dropped because the body mentions no price.`}
      >
        <KeptAndDropped
          {...bodyFilter}
          keptTitle="Kept (mentions a price)"
          droppedTitle="Dropped (no price)"
        />
      </Step>

      <Step
        number={firstNumber + 4}
        title="Item keyword check"
        durationMs={timings.keywordFilter}
        summary={
          limited
            ? `Scan categories: ${keywordFilter.scanCategories.join(", ")}. ${keywordFilter.matched.length} name an item from those categories and skip the content check · ${keywordFilter.unmatched.length} go to the content check. Nothing is dropped here.`
            : "Skipped: this user has no scan categories, so nothing is limited."
        }
      >
        <KeptAndDropped
          kept={keywordFilter.matched}
          dropped={keywordFilter.unmatched}
          keptTitle="Keyword match (skips the content check)"
          droppedTitle="No match (goes to the content check)"
        />
      </Step>

      <Step
        number={firstNumber + 5}
        title="Category content check"
        durationMs={timings.contentFilter}
        summary={
          contentFilter.enabled
            ? `${contentFilter.kept.length} kept · ${contentFilter.dropped.length} dropped because Jev found no purchased item in the scan categories. ${contentFilter.checked} emails checked; ${bodyFilter.kept.length - contentFilter.checked} keyword matches skipped the check. ${contentFilter.failures.length} calls failed or timed out; those emails were kept.`
            : limited
              ? "Skipped: JEV_API_KEY is not set."
              : "Skipped: this user has no scan categories, so nothing is limited."
        }
      >
        <JevFailures failures={contentFilter.failures} />
        <KeptAndDropped
          kept={contentFilter.kept}
          dropped={contentFilter.dropped}
          keptTitle="Kept (has an in-category item)"
          droppedTitle="Dropped (nothing in the categories)"
        />
      </Step>
    </>
  );
}

// Rough rule of thumb for English text; only used to give a sense of scale.
function approxTokens(chars: number): string {
  return `~${Math.round(chars / 4).toLocaleString()} tokens`;
}

function AiStep({
  number,
  ai,
  alreadyImportedChecked,
}: {
  number: number;
  ai: ScanPipelineTestResult["ai"];
  // False for test emails, which are never imported.
  alreadyImportedChecked: boolean;
}) {
  const emailsSent = ai.batches.reduce((n, b) => n + b.emails.length, 0);
  const charsBefore = ai.batches.reduce((n, b) => n + b.charsBeforeTrimming, 0);
  const charsAfter = ai.batches.reduce((n, b) => n + b.userMessage.length, 0);
  const truncated = ai.batches.reduce((n, b) => n + b.truncatedEmails, 0);
  const saved =
    charsBefore > 0 ? Math.round((1 - charsAfter / charsBefore) * 100) : 0;

  return (
    <details className="border-t border-border px-6 py-4">
      <summary className="cursor-pointer list-none">
        <h3 className="font-ui text-sm font-medium text-foreground">
          Step {number}: Sent to Claude
        </h3>
        <p className="font-ui text-xs text-subtle-foreground">
          {alreadyImportedChecked
            ? `${ai.alreadyImported.length} skipped as already imported · `
            : ""}
          {emailsSent} emails would be sent in {ai.batches.length}{" "}
          {ai.batches.length === 1 ? "batch" : "batches"} to {ai.provider} (
          {ai.model}). Trimmed from {charsBefore.toLocaleString()} to{" "}
          {charsAfter.toLocaleString()} characters ({saved}% smaller,{" "}
          {approxTokens(charsAfter)}). Click to expand.
        </p>
      </summary>
      <div className="mt-4 space-y-4">
        <div className="rounded-lg border border-border p-3 font-ui text-sm text-foreground">
          <h4 className="mb-2 font-medium">How email text is trimmed</h4>
          <p className="mb-2 text-subtle-foreground">
            Only the copy sent to Claude is trimmed. Every filter above read the
            full email.
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-subtle-foreground">
            <li>
              Every photo URL becomes <code>[photo N]</code> and every link URL
              becomes <code>[link N]</code>. Claude answers with those numbers
              and the real URLs are filled back in afterwards, so they are never
              sent.
            </li>
            <li>
              Links that never point at a product are removed: unsubscribe,
              privacy, terms, email preferences, "view in browser", social
              media, app stores, email and phone links.
            </li>
            <li>
              Footer text is cut from the first "Unsubscribe", "Privacy Policy",
              "All rights reserved", "©" or similar marker, but only if it comes
              after the last price in the email, so order details are never cut.
            </li>
          </ol>
          <p className="mt-2 text-subtle-foreground">
            Each email is then capped at 12,000 characters.
            {truncated > 0 &&
              ` ${truncated} ${truncated === 1 ? "email is" : "emails are"} still over the cap after trimming and will be cut off.`}
          </p>
        </div>

        {alreadyImportedChecked && (
          <LabeledList
            title="Skipped — already imported"
            emails={ai.alreadyImported}
            emptyLabel="None were already imported."
          />
        )}

        <div>
          <h4 className="mb-2 font-ui text-sm font-medium text-foreground">
            Instructions (same for every batch)
          </h4>
          <CodeBlock>{ai.tool.description}</CodeBlock>
        </div>
        <div>
          <h4 className="mb-2 font-ui text-sm font-medium text-foreground">
            Fields Claude fills in, with their instructions
          </h4>
          <p className="mb-2 font-ui text-xs text-subtle-foreground">
            {ai.allowedCategories.length > 0
              ? `Only these categories are allowed (anything else is skipped): ${ai.allowedCategories.join(", ")}`
              : `No scan categories, so any category is allowed. Existing categories passed in: ${
                  ai.existingCategories.length > 0
                    ? ai.existingCategories.join(", ")
                    : "none"
                }`}
          </p>
          <CodeBlock>{JSON.stringify(ai.tool.input_schema, null, 2)}</CodeBlock>
        </div>

        {ai.batches.length === 0 ? (
          <p className="font-ui text-sm text-subtle-foreground">
            Nothing would be sent to Claude.
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
                emails · {batch.charsBeforeTrimming.toLocaleString()} →{" "}
                {batch.userMessage.length.toLocaleString()} characters)
              </summary>
              <div className="mt-3 space-y-3">
                <SubjectList emails={batch.emails} emptyLabel="Empty batch." />
                <h4 className="font-ui text-sm font-medium text-foreground">
                  Message sent to Claude
                </h4>
                <CodeBlock>{batch.userMessage}</CodeBlock>
              </div>
            </details>
          ))
        )}
      </div>
    </details>
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
            Runs every filter of the real scan against this user's live inbox,
            shows what each step kept, and shows the exact trimmed messages that
            would be sent to Claude (step 9). Makes the same Jev calls as the
            real scan. Claude is not called and no items are created.
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

function shortUrl(url: string | null): string {
  if (!url) return "none";
  return url.length > 80 ? `${url.slice(0, 80)}…` : url;
}

function ExtractedItems({
  number,
  items,
}: {
  number: number;
  items: NonNullable<MockScanTestResult["extracted"]>;
}) {
  return (
    <details className="border-t border-border px-6 py-4" open>
      <summary className="cursor-pointer list-none">
        <h3 className="font-ui text-sm font-medium text-foreground">
          Step {number}: What Claude found
        </h3>
        <p className="font-ui text-xs text-subtle-foreground">
          {items.length} items. Nothing was saved. Compare against each test
          email's expected result above. Click to collapse.
        </p>
      </summary>
      {items.length === 0 ? (
        <p className="mt-4 font-ui text-sm text-subtle-foreground">
          Claude found no items.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
          {items.map((item, i) => (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: results never reorder
              key={i}
              className="space-y-1 px-4 py-3 font-ui text-sm text-foreground"
            >
              <p>
                <span className="font-medium">{item.name}</span> ·{" "}
                {item.quantity} × ${item.price.toFixed(2)} · {item.category} ·{" "}
                {item.merchant}
              </p>
              <p className="text-xs text-subtle-foreground">
                From: {item.emailSubject}
              </p>
              <p className="break-all font-mono text-xs text-subtle-foreground">
                Photo: {shortUrl(item.imageUrl)}
              </p>
              <p className="break-all font-mono text-xs text-subtle-foreground">
                Link: {shortUrl(item.link)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

function MockResult({ result }: { result: MockScanTestResult }) {
  return (
    <>
      <div className="border-t border-border px-6 py-4">
        <p className="font-ui text-sm text-foreground">
          <span className="font-display text-2xl">
            {result.bodyFilter.kept.length}
          </span>{" "}
          of {result.mockEmails.length} test emails left after every filter -
          see step 7 for exactly what is sent to Claude.
        </p>
        <p className="font-ui text-xs text-subtle-foreground">
          Filters took {formatDuration(result.timings.total)}.
        </p>
      </div>

      <details className="border-t border-border px-6 py-4">
        <summary className="cursor-pointer list-none">
          <h3 className="font-ui text-sm font-medium text-foreground">
            The test emails and what should happen to each
          </h3>
          <p className="font-ui text-xs text-subtle-foreground">
            {result.mockEmails.length} emails, defined in
            src/lib/google/mock-emails.ts. Click to expand.
          </p>
        </summary>
        <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
          {result.mockEmails.map((email, i) => (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: the list never reorders
              key={i}
              className="px-4 py-2 font-ui text-sm text-foreground"
            >
              <p>
                <span className="font-medium">{email.subject}</span>{" "}
                <span className="text-subtle-foreground">— {email.from}</span>
              </p>
              <p className="text-xs text-subtle-foreground">
                Expected: {email.expected}
              </p>
            </li>
          ))}
        </ul>
      </details>

      <FilterSteps result={result} firstNumber={1} downloaded={false} />
      <AiStep number={7} ai={result.ai} alreadyImportedChecked={false} />
      {result.extracted && (
        <ExtractedItems number={8} items={result.extracted} />
      )}
    </>
  );
}

export function MockScanTester({ userId }: { userId: string }) {
  const [state, setState] = useState<
    | { status: "idle" }
    | { status: "loading"; runExtraction: boolean }
    | { status: "error"; message: string }
    | { status: "done"; result: MockScanTestResult }
  >({ status: "idle" });

  async function runScan(runExtraction: boolean) {
    setState({ status: "loading", runExtraction });
    try {
      const res = await fetch("/api/admin/scan-pipeline/mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, runExtraction }),
      });
      if (!res.ok) {
        const { error } = (await res.json()) as { error?: string };
        setState({ status: "error", message: error ?? "Scan failed" });
        return;
      }
      const result = (await res.json()) as MockScanTestResult;
      setState({ status: "done", result });
    } catch (err) {
      setState({ status: "error", message: errorMessage(err) });
    }
  }

  const loading = state.status === "loading";

  return (
    <div className="mb-6 rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg tracking-wide text-foreground">
            Test scan with test emails
          </h2>
          <p className="font-ui text-xs text-subtle-foreground">
            Runs built-in test emails, each with a known expected result,
            through the same filters and trimming as the real scan, using this
            user's categories and scan categories. Doesn't touch Gmail. Makes
            Jev calls. "Run with Claude" also sends the trimmed emails to Claude
            (a few cents) and shows the items it found. No items are ever saved.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => runScan(false)}
            disabled={loading}
            className="rounded-full font-ui"
          >
            {loading && !state.runExtraction ? "Running…" : "Run filters"}
          </Button>
          <Button
            type="button"
            onClick={() => runScan(true)}
            disabled={loading}
            className="rounded-full font-ui"
          >
            {loading && state.runExtraction ? "Running…" : "Run with Claude"}
          </Button>
        </div>
      </div>

      {state.status === "error" && (
        <p className="border-t border-border px-6 py-4 font-ui text-sm text-destructive">
          {state.message}
        </p>
      )}

      {state.status === "done" && <MockResult result={state.result} />}
    </div>
  );
}
