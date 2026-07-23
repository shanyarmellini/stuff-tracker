"use client";

import { useState } from "react";
import { cn } from "~/lib/utils";
import { verifyGmailAppPassword } from "./actions";

const CODE_LENGTH = 16;
const APP_PASSWORD_URL = "https://myaccount.google.com/apppasswords";

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

  const codeComplete = code.replace(/\s+/g, "").length === CODE_LENGTH;

  async function handleCopyLink() {
    await navigator.clipboard.writeText(APP_PASSWORD_URL);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!codeComplete) {
      setError(`Please enter the full ${CODE_LENGTH}-character app password.`);
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
    <div className="w-full max-w-lg rounded-3xl border border-sky-100 bg-white p-10 shadow-sm">
      <h1 className="mb-1 font-display text-3xl tracking-wide text-slate-800">
        Connect Gmail
      </h1>
      {email && (
        <p className="mb-8 font-ui text-sm text-slate-400">
          Signed in as{" "}
          <span className="font-medium text-slate-600">{email}</span>
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        <div>
          <p className="mb-3 font-ui text-sm font-medium text-slate-700">
            Instructions
          </p>
          <ol className="list-decimal space-y-2.5 pl-5 font-ui text-sm text-slate-500">
            <li>
              Copy this link and paste it into your browser:
              <div className="mt-1.5 flex items-center gap-2">
                <code className="flex-1 truncate rounded-lg border border-sky-100 bg-sky-50/60 px-2.5 py-1.5 text-xs text-slate-600">
                  {APP_PASSWORD_URL}
                </code>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="shrink-0 rounded-lg border border-sky-100 px-2.5 py-1.5 font-ui text-xs font-medium text-sky-600 transition-colors hover:bg-sky-50"
                >
                  {linkCopied ? "Copied!" : "Copy"}
                </button>
              </div>
            </li>
            <li>
              Log in with{" "}
              {email ? (
                <span className="font-medium text-slate-600">{email}</span>
              ) : (
                "your Gmail account"
              )}
              .
            </li>
            <li>
              <span className="font-bold uppercase text-slate-700">
                Only if it asks you
              </span>
              , turn on{" "}
              <span className="font-medium text-slate-600">
                2-Step Verification
              </span>{" "}
              first, then come back to this same link.{" "}
              <span className="font-bold uppercase text-slate-700">
                This step is optional.
              </span>
            </li>
            <li>
              Under &quot;App name&quot;, type{" "}
              <span className="font-medium text-slate-600">Stuff Tracker</span>{" "}
              and click{" "}
              <span className="font-medium text-slate-600">Create</span>.
            </li>
            <li>
              Google will show you a 16-character password in a yellow box, like{" "}
              <span className="font-medium text-slate-600">
                abcd efgh ijkl mnop
              </span>
              . Copy it.
            </li>
            <li>Paste it into the box below and click Verify.</li>
          </ol>
          <p className="mt-3 font-ui text-xs text-slate-400">
            Stuck at any point? Email{" "}
            <a
              href="mailto:shany.armellini@gmail.com"
              className="font-medium text-sky-600 hover:underline"
            >
              shany.armellini@gmail.com
            </a>{" "}
            and we&apos;ll help you out.
          </p>
        </div>

        <div>
          <label
            htmlFor="verification-code"
            className="mb-3 block font-ui text-sm font-medium text-slate-700"
          >
            Paste your 16-character Gmail app password
          </label>
          <input
            id="verification-code"
            type="text"
            autoComplete="one-time-code"
            spellCheck={false}
            placeholder="xxxx xxxx xxxx xxxx"
            value={code}
            disabled={submitting}
            onChange={(e) => {
              const cleaned = e.target.value.replace(/[^a-zA-Z0-9\s]/g, "");
              let nonSpaceCount = 0;
              let result = "";
              for (const char of cleaned) {
                if (char === " ") {
                  result += char;
                } else if (nonSpaceCount < CODE_LENGTH) {
                  result += char;
                  nonSpaceCount++;
                }
              }
              setCode(result);
            }}
            className={cn(
              "w-full rounded-xl border border-sky-100 bg-white px-4 py-2.5 font-ui text-sm tracking-widest text-slate-700 shadow-sm outline-none placeholder:text-slate-300 focus:border-sky-300 focus:ring-2 focus:ring-sky-100 transition-all disabled:cursor-not-allowed disabled:opacity-50",
            )}
          />
          <p className="mt-2 font-ui text-xs text-slate-400">
            {code.replace(/\s+/g, "").length}/{CODE_LENGTH} characters
          </p>
          {error && (
            <p className="mt-2 font-ui text-xs text-red-500">{error}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 w-full rounded-xl bg-sky-500 py-3 font-ui text-sm font-medium text-white shadow-sm transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Verifying..." : "Verify"}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={onSkipped}
          className="-mt-4 w-full font-ui text-sm text-slate-400 transition-colors hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Skip for now
        </button>
      </form>
    </div>
  );
}
