"use client";

import { useState } from "react";
import { cn } from "~/lib/utils";
import { verifyGmailAppPassword } from "./actions";

const CODE_LENGTH = 16;

export function VerificationStep({
  email,
  onVerified,
}: {
  email: string | null;
  onVerified: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const codeComplete = code.replace(/\s+/g, "").length === CODE_LENGTH;

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
          <ol className="list-decimal space-y-1.5 pl-5 font-ui text-sm text-slate-500">
            <li>
              Go to{" "}
              <span className="font-medium text-slate-600">
                myaccount.google.com/apppasswords
              </span>{" "}
              and sign in with{" "}
              {email ? (
                <span className="font-medium text-slate-600">{email}</span>
              ) : (
                "your Gmail account"
              )}
              .
            </li>
            <li>
              If prompted, turn on{" "}
              <span className="font-medium text-slate-600">
                2-Step Verification
              </span>{" "}
              first — app passwords require it.
            </li>
            <li>
              Under &quot;App name&quot;, type something like{" "}
              <span className="font-medium text-slate-600">Stuff Tracker</span>{" "}
              and click{" "}
              <span className="font-medium text-slate-600">Create</span>.
            </li>
            <li>
              Google will show a 16-character password in a yellow box. Copy it
              (spaces are fine, we&apos;ll strip them).
            </li>
            <li>Paste it below.</li>
          </ol>
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
              const cleaned = e.target.value
                .replace(/[^a-zA-Z0-9\s]/g, "")
                .slice(0, CODE_LENGTH + 3);
              setCode(cleaned);
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
      </form>
    </div>
  );
}
