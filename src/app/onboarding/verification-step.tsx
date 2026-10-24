"use client";

import { useState } from "react";
import {
  FIELD_INPUT_CLASS,
  FIELD_LABEL_CLASS,
  ONBOARDING_CARD_CLASS,
  ONBOARDING_TITLE_CLASS,
  SUBMIT_BUTTON_CLASS,
} from "~/components/class-names";
import { cn } from "~/lib/utils";
import { verifyGmailAppPassword } from "./actions";
import { APP_PASSWORD_LENGTH } from "./constants";

const APP_PASSWORD_URL = "https://myaccount.google.com/apppasswords";
const SUPPORT_EMAIL = "shany.armellini@gmail.com";

/** Strips anything but letters, digits and spaces, capped at APP_PASSWORD_LENGTH non-space chars. */
function sanitizeAppPassword(value: string): string {
  let nonSpaceCount = 0;
  let result = "";
  for (const char of value.replace(/[^a-zA-Z0-9\s]/g, "")) {
    if (char === " ") {
      result += char;
    } else if (nonSpaceCount < APP_PASSWORD_LENGTH) {
      result += char;
      nonSpaceCount++;
    }
  }
  return result;
}

export function VerificationStep({
  email,
  onVerified,
  onSkipped,
}: {
  email: string | null;
  onVerified: () => void;
  onSkipped: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const codeLength = code.replace(/\s+/g, "").length;
  const codeComplete = codeLength === APP_PASSWORD_LENGTH;

  async function handleCopyLink() {
    await navigator.clipboard.writeText(APP_PASSWORD_URL);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!codeComplete) {
      setError(
        `Please enter the full ${APP_PASSWORD_LENGTH}-character app password.`,
      );
      return;
    }
    setError(null);
    setSubmitting(true);
    const result = await verifyGmailAppPassword(code);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onVerified();
  }

  return (
    <div className={ONBOARDING_CARD_CLASS}>
      <h1 className={ONBOARDING_TITLE_CLASS}>Connect Gmail</h1>
      {email && (
        <p className="mb-8 font-ui text-sm text-subtle-foreground">
          Signed in as{" "}
          <span className="font-medium text-muted-foreground">{email}</span>
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        <div>
          <p className="mb-3 font-ui text-sm font-medium text-foreground">
            Instructions
          </p>
          <ol className="list-decimal space-y-2.5 pl-5 font-ui text-sm text-muted-foreground">
            <li>
              Copy this link and paste it into your browser:
              <div className="mt-1.5 flex items-center gap-2">
                <code className="flex-1 truncate rounded-lg border border-border bg-muted/60 px-2.5 py-1.5 text-xs text-muted-foreground">
                  {APP_PASSWORD_URL}
                </code>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="shrink-0 rounded-lg border border-border px-2.5 py-1.5 font-ui text-xs font-medium text-brand-strong transition-colors hover:bg-muted"
                >
                  {linkCopied ? "Copied!" : "Copy"}
                </button>
              </div>
            </li>
            <li>
              Log in with{" "}
              {email ? (
                <span className="font-medium text-muted-foreground">
                  {email}
                </span>
              ) : (
                "your Gmail account"
              )}
              .
            </li>
            <li>
              <span className="font-bold uppercase text-foreground">
                Only if it asks you
              </span>
              , turn on{" "}
              <span className="font-medium text-muted-foreground">
                2-Step Verification
              </span>{" "}
              first, then come back to this same link.{" "}
              <span className="font-bold uppercase text-foreground">
                This step is optional.
              </span>
            </li>
            <li>
              Under &quot;App name&quot;, type{" "}
              <span className="font-medium text-muted-foreground">
                Stuff Tracker
              </span>{" "}
              and click{" "}
              <span className="font-medium text-muted-foreground">Create</span>.
            </li>
            <li>
              Google will show you a {APP_PASSWORD_LENGTH}-character password in
              a yellow box, like{" "}
              <span className="font-medium text-muted-foreground">
                abcd efgh ijkl mnop
              </span>
              . Copy it.
            </li>
            <li>Paste it into the box below and click Verify.</li>
          </ol>
          <p className="mt-3 font-ui text-xs text-subtle-foreground">
            Stuck at any point? Email{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="font-medium text-brand-strong hover:underline"
            >
              {SUPPORT_EMAIL}
            </a>{" "}
            and we&apos;ll help you out.
          </p>
        </div>

        <div>
          <label htmlFor="verification-code" className={FIELD_LABEL_CLASS}>
            Paste your {APP_PASSWORD_LENGTH}-character Gmail app password
          </label>
          <input
            id="verification-code"
            type="text"
            autoComplete="one-time-code"
            spellCheck={false}
            placeholder="xxxx xxxx xxxx xxxx"
            value={code}
            disabled={submitting}
            onChange={(e) => setCode(sanitizeAppPassword(e.target.value))}
            className={cn(FIELD_INPUT_CLASS, "w-full px-4 tracking-widest")}
          />
          <p className="mt-2 font-ui text-xs text-subtle-foreground">
            {codeLength}/{APP_PASSWORD_LENGTH} characters
          </p>
          {error && (
            <p className="mt-2 font-ui text-xs text-destructive">{error}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className={SUBMIT_BUTTON_CLASS}
        >
          {submitting ? "Verifying..." : "Verify"}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={onSkipped}
          className="-mt-4 w-full font-ui text-sm text-subtle-foreground transition-colors hover:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          Skip for now
        </button>
      </form>
    </div>
  );
}
