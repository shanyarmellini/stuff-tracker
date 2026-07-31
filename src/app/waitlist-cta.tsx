"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

export function WaitlistCta() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }

      setStatus("done");
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <p className="mt-2 font-ui text-base text-slate-600">
        You&apos;re on the list! We&apos;ll email you when it&apos;s your turn.
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 flex w-full max-w-sm flex-col items-center gap-2"
    >
      <div className="flex w-full flex-col items-center gap-2 sm:flex-row">
        <Input
          type="text"
          required
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-white"
        />
        <Input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-white"
        />
      </div>
      <Button
        type="submit"
        size="lg"
        className="w-full shrink-0 font-ui"
        disabled={status === "loading"}
      >
        {status === "loading" ? "Joining..." : "Join the waitlist"}
      </Button>
      {error && <p className="font-ui text-sm text-destructive">{error}</p>}
    </form>
  );
}
