"use client";

import { useEffect, useState } from "react";
import { LoadingText, SubPageShell } from "~/components/sub-page-shell";
import type { GmailMessage } from "~/lib/google/gmail";

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
    const setPending = pageToken ? setLoadingMore : setLoading;
    setPending(true);
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
      setPending(false);
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
    <SubPageShell
      title="Emails"
      subtitle={
        connected && email
          ? `Emails Stuff Tracker can access from ${email}`
          : "Connect an account to see the emails Stuff Tracker has access to."
      }
    >
      {error && (
        <p className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 font-ui text-sm text-destructive">
          {error}
        </p>
      )}

      {loading ? (
        <LoadingText />
      ) : !connected ? (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="font-ui text-sm text-muted-foreground">
            Connect your Gmail to see the emails Stuff Tracker has access to
            here.
          </p>
          <a
            href="/api/google/connect"
            className="rounded-lg border border-input bg-muted px-4 py-2 font-ui text-sm text-brand-strong transition-colors hover:bg-brand/10"
          >
            Connect Gmail
          </a>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="truncate font-ui text-sm text-muted-foreground">
              {email}
            </p>
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="shrink-0 font-ui text-sm text-destructive transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {disconnecting ? "Disconnecting…" : "Disconnect"}
            </button>
          </div>

          {messages.length === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-2xl border border-dashed border-input bg-card">
              <p className="font-ui text-sm text-subtle-foreground">
                No emails found.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {messages.map((message) => (
                <li
                  key={message.id}
                  className="rounded-xl border border-border bg-card p-3 shadow-sm"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate font-ui text-sm font-semibold text-foreground">
                      {message.subject || "(no subject)"}
                    </p>
                    {message.date && (
                      <p className="shrink-0 font-ui text-xs text-subtle-foreground">
                        {message.date}
                      </p>
                    )}
                  </div>
                  <p className="truncate font-ui text-xs text-subtle-foreground">
                    {message.from}
                  </p>
                  <p className="line-clamp-2 font-ui text-xs text-subtle-foreground">
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
              className="self-center rounded-lg border border-input bg-card px-4 py-2 font-ui text-sm text-brand-strong shadow-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          )}
        </div>
      )}
    </SubPageShell>
  );
}
