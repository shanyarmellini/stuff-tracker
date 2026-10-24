"use client";

import { useState } from "react";
import { ScanningStep } from "~/app/onboarding/scanning-step";
import { VerificationStep } from "~/app/onboarding/verification-step";
import { createClient } from "~/lib/supabase/client";
import { EXTRACTION_LIMIT } from "~/lib/usage";
import { cn } from "~/lib/utils";
import {
  MODAL_BACKDROP,
  MODAL_TITLE,
  PRIMARY_BUTTON,
  SECONDARY_BUTTON,
  TEXT_FIELD,
} from "../_lib/styles";

type Step = "choice" | "paste" | "gmail-verify" | "gmail-scanning";

type ExtractResponse = {
  added?: number;
  itemIds?: string[];
  error?: string;
  truncationWarning?: string | null;
};

const NO_PURCHASE_FOUND =
  "No purchase was found in that email. Paste the order confirmation you got right after checkout (it should show a price) — not a shipping or delivery update, which won't have one.";

const CHOICE_BUTTON = cn("px-4 py-3 text-left font-ui", PRIMARY_BUTTON);

export function EmailImportModal({
  email,
  extractionsUsed,
  onItemsChanged,
  onUsageChanged,
  onClose,
}: {
  email: string | null;
  extractionsUsed: number | null;
  onItemsChanged: () => Promise<void>;
  onUsageChanged: () => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>("choice");
  const paste = usePasteEmail({ onItemsChanged, onUsageChanged });

  return (
    <div className={MODAL_BACKDROP}>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      {step === "gmail-verify" ? (
        <div className="relative z-10">
          <VerificationStep
            email={email}
            onVerified={() => setStep("gmail-scanning")}
            onSkipped={() => setStep("choice")}
          />
        </div>
      ) : step === "gmail-scanning" ? (
        <div className="relative z-10">
          <ScanningStep
            onDone={async () => {
              await onItemsChanged();
              onClose();
            }}
          />
        </div>
      ) : (
        <div className="relative z-10 flex w-full max-w-lg flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-lg">
          {step === "choice" ? (
            <>
              <h2 className={MODAL_TITLE}>Add via email</h2>
              <p className="-mt-2 font-ui text-sm text-subtle-foreground">
                Choose how you&apos;d like to add items from your email.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setStep("paste")}
                  className={CHOICE_BUTTON}
                >
                  <span className="block font-display tracking-wide text-brand-strong">
                    Paste an email
                  </span>
                  <span className="mt-0.5 block text-xs text-subtle-foreground">
                    Paste the text of an order confirmation email.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep("gmail-verify")}
                  className={CHOICE_BUTTON}
                >
                  <span className="block font-display tracking-wide text-brand-strong">
                    Connect Gmail
                  </span>
                  <span className="mt-0.5 block text-xs text-subtle-foreground">
                    Verify a Gmail app password so we can scan your inbox
                    automatically.
                  </span>
                </button>
              </div>
              <button
                type="button"
                onClick={onClose}
                className={SECONDARY_BUTTON}
              >
                Cancel
              </button>
            </>
          ) : (
            <PasteEmailStep
              paste={paste}
              extractionsUsed={extractionsUsed}
              onBack={() => setStep("choice")}
              onClose={onClose}
            />
          )}
        </div>
      )}
    </div>
  );
}

/** Paste-step state lives in the modal so it survives going Back. */
function usePasteEmail({
  onItemsChanged,
  onUsageChanged,
}: {
  onItemsChanged: () => Promise<void>;
  onUsageChanged: () => void;
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [truncationWarning, setTruncationWarning] = useState<string | null>(
    null,
  );
  const [result, setResult] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [undoing, setUndoing] = useState(false);

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setTruncationWarning(null);
    setResult(null);
    setAddedIds([]);
    try {
      const res = await fetch("/api/manual-emails/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      const data: ExtractResponse = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      onUsageChanged();
      setTruncationWarning(data.truncationWarning ?? null);

      const added = data.added ?? 0;
      if (added === 0) {
        setResult(NO_PURCHASE_FOUND);
      } else {
        setResult(
          `Added ${added} item${added === 1 ? "" : "s"} to your collection.`,
        );
        setAddedIds(data.itemIds ?? []);
        setText("");
        await onItemsChanged();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const undo = async () => {
    if (addedIds.length === 0) return;
    setUndoing(true);
    const { error: deleteError } = await createClient()
      .from("items")
      .delete()
      .in("id", addedIds);
    setUndoing(false);
    if (deleteError) {
      console.error("Failed to undo added items:", deleteError.message);
      setError("Couldn't undo — please try again.");
      return;
    }
    setAddedIds([]);
    setResult("Removed those items from your collection.");
    await onItemsChanged();
  };

  return {
    text,
    setText,
    loading,
    error,
    truncationWarning,
    result,
    addedIds,
    undoing,
    submit,
    undo,
  };
}

function PasteEmailStep({
  paste,
  extractionsUsed,
  onBack,
  onClose,
}: {
  paste: ReturnType<typeof usePasteEmail>;
  extractionsUsed: number | null;
  onBack: () => void;
  onClose: () => void;
}) {
  const {
    text,
    setText,
    loading,
    error,
    truncationWarning,
    result,
    addedIds,
    undoing,
    submit,
    undo,
  } = paste;

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-1 font-ui text-xs text-subtle-foreground transition-colors hover:text-muted-foreground"
          >
            ← Back
          </button>
          <h2 className={MODAL_TITLE}>Paste an email</h2>
        </div>
        {extractionsUsed !== null && (
          <span className="shrink-0 rounded-full border border-input bg-muted px-3 py-1 font-ui text-xs font-medium text-brand-strong">
            {Math.min(extractionsUsed, EXTRACTION_LIMIT)}/{EXTRACTION_LIMIT}{" "}
            used
          </span>
        )}
      </div>
      <div className="-mt-2">
        <p className="mt-1 font-ui text-sm text-subtle-foreground">
          Paste the full text of an order confirmation email below. AI will pull
          out the item, price, and store, and add it to your collection.
        </p>
        <p className="mt-2 font-ui text-xs text-subtle-foreground">
          Tip: paste &ldquo;Show original&rdquo; instead of the visible email to
          also get a product photo and link. In Gmail, open the actual email
          itself (not an order-tracking summary card) — the &#8942; (more) menu
          you want is on the right side of that email, a little below the top
          toolbar, next to reply/forward. Click it and choose &ldquo;Show
          original,&rdquo; then paste that raw source here instead of the
          rendered email text.
        </p>
      </div>
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="From: orders@store.com&#10;Subject: Your order has shipped&#10;&#10;Thanks for your order..."
          rows={10}
          disabled={loading}
          className={cn(
            TEXT_FIELD,
            "resize-none px-4 py-3 pr-16 disabled:opacity-60",
          )}
        />
        {text && !loading && (
          <button
            type="button"
            onClick={() => setText("")}
            className="absolute right-3 top-3 rounded-full bg-muted px-2 py-1 font-ui text-xs font-medium text-muted-foreground transition-colors hover:bg-input hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>
      {error && <p className="font-ui text-sm text-destructive">{error}</p>}
      {truncationWarning && (
        <p className="font-ui text-sm text-warning">{truncationWarning}</p>
      )}
      {result && (
        <div className="flex items-center justify-between gap-2">
          <p className="font-ui text-sm text-brand-strong">{result}</p>
          {addedIds.length > 0 && (
            <button
              type="button"
              onClick={undo}
              disabled={undoing}
              className="shrink-0 font-ui text-sm font-medium text-destructive underline decoration-dotted underline-offset-2 transition-colors hover:text-destructive/80 disabled:opacity-50"
            >
              {undoing ? "Undoing…" : "Undo"}
            </button>
          )}
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className={cn("flex-1", SECONDARY_BUTTON)}
        >
          Close
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!text.trim() || loading}
          className={cn(
            "flex-1 py-2.5 disabled:cursor-not-allowed disabled:opacity-40",
            PRIMARY_BUTTON,
          )}
        >
          {loading ? "Reading…" : "Extract items"}
        </button>
      </div>
    </>
  );
}
