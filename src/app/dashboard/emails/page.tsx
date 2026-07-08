"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { GmailMessage } from "~/lib/google/gmail";

function BackIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}

export default function EmailsPage() {
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [connected, setConnected] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmailError = params.get("gmail_error");
    if (gmailError) {
      setError(gmailError);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const fetchEmails = async (pageToken?: string) => {
    if (pageToken) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    try {
      const url = pageToken
        ? `/api/google/emails?pageToken=${encodeURIComponent(pageToken)}`
        : "/api/google/emails";
      const res = await fetch(url);
      const data: {
        connected: boolean;
        email?: string | null;
        messages?: GmailMessage[];
        nextPageToken?: string | null;
      } = await res.json();
      setConnected(data.connected);
      setEmail(data.connected ? (data.email ?? null) : null);
      setNextPageToken(data.connected ? (data.nextPageToken ?? null) : null);
      setMessages((prev) =>
        pageToken ? [...prev, ...(data.messages ?? [])] : (data.messages ?? []),
      );
    } catch {
      if (!pageToken) {
        setConnected(false);
        setMessages([]);
      }
    } finally {
      if (pageToken) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: fetch only on mount
  useEffect(() => {
    fetchEmails();
  }, []);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/google/disconnect", { method: "POST" });
      if (res.ok) {
        setConnected(false);
        setEmail(null);
        setMessages([]);
        setNextPageToken(null);
      }
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-sky-50/40 px-8 py-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1.5 font-ui text-sm text-slate-500 transition-colors hover:text-sky-600"
        >
          <BackIcon />
          Back to My Items
        </Link>

        <h1 className="mb-1 font-display text-4xl tracking-wide text-slate-800">
          Emails
        </h1>
        <p className="mb-6 font-ui text-sm text-slate-400">
          {connected && email
            ? `Emails Stuff Tracker can access from ${email}`
            : "Connect an account to see the emails Stuff Tracker has access to."}
        </p>

        {error && (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 font-ui text-sm text-red-500">
            {error}
          </p>
        )}

        {loading ? (
          <p className="font-ui text-sm text-slate-400">Loading…</p>
        ) : !connected ? (
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-sky-100 bg-white p-6 shadow-sm">
            <p className="font-ui text-sm text-slate-500">
              Connect your Gmail to see the emails Stuff Tracker has access to
              here.
            </p>
            <a
              href="/api/google/connect"
              className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 font-ui text-sm text-sky-600 transition-colors hover:bg-sky-100"
            >
              Connect Gmail
            </a>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2 rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
              <p className="truncate font-ui text-sm text-slate-500">{email}</p>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="shrink-0 font-ui text-sm text-red-500 transition-colors hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {disconnecting ? "Disconnecting…" : "Disconnect"}
              </button>
            </div>

            {messages.length === 0 ? (
              <div className="flex h-32 items-center justify-center rounded-2xl border border-dashed border-sky-200 bg-white">
                <p className="font-ui text-sm text-slate-400">
                  No emails found.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {messages.map((message) => (
                  <li
                    key={message.id}
                    className="rounded-xl border border-sky-100 bg-white p-3 shadow-sm"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate font-ui text-sm font-semibold text-slate-700">
                        {message.subject || "(no subject)"}
                      </p>
                      {message.date && (
                        <p className="shrink-0 font-ui text-xs text-slate-400">
                          {message.date}
                        </p>
                      )}
                    </div>
                    <p className="truncate font-ui text-xs text-slate-400">
                      {message.from}
                    </p>
                    <p className="line-clamp-2 font-ui text-xs text-slate-400">
                      {message.snippet}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            {nextPageToken && (
              <button
                type="button"
                onClick={() => fetchEmails(nextPageToken)}
                disabled={loadingMore}
                className="self-center rounded-lg border border-sky-200 bg-white px-4 py-2 font-ui text-sm text-sky-600 shadow-sm transition-colors hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
