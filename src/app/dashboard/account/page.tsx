"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { signout } from "~/app/auth/actions";
import { createClient } from "~/lib/supabase/client";

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

function formatDate(iso: string | undefined | null) {
  if (!iso) return "Unknown";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const EXTRACTION_LIMIT = 250;

type PlanInfo = {
  isPro: boolean;
  used: number;
  currentPeriodEnd: string | null;
};

export default function AccountPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | undefined>(undefined);
  const [itemTypes, setItemTypes] = useState<string[]>([]);
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingLoading, setBillingLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user;
      if (!user) {
        setLoading(false);
        return;
      }
      setEmail(user.email ?? null);
      setCreatedAt(user.created_at);
      const { data: profile } = await supabase
        .from("profiles")
        .select("item_types")
        .eq("user_id", user.id)
        .single();
      setItemTypes(profile?.item_types ?? []);

      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("status, current_period_start, current_period_end")
        .eq("user_id", user.id)
        .maybeSingle();

      const isPro =
        subscription?.status === "active" ||
        subscription?.status === "trialing";

      let usageQuery = supabase
        .from("extraction_usage")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      if (isPro && subscription?.current_period_start) {
        usageQuery = usageQuery.gte(
          "created_at",
          subscription.current_period_start,
        );
      }
      const { count } = await usageQuery;

      setPlan({
        isPro,
        used: count ?? 0,
        currentPeriodEnd: subscription?.current_period_end ?? null,
      });
      setLoading(false);
    });
  }, []);

  async function goToBilling(endpoint: "checkout" | "portal") {
    setBillingLoading(true);
    try {
      const res = await fetch(`/api/stripe/${endpoint}`, { method: "POST" });
      const body = (await res.json()) as { url?: string; error?: string };
      if (body.url) {
        window.location.href = body.url;
        return;
      }
      console.error(body.error ?? "Failed to open billing page");
    } finally {
      setBillingLoading(false);
    }
  }

  const initial = email ? email.charAt(0).toUpperCase() : "?";

  return (
    <div className="min-h-screen bg-sky-50/40 dark:bg-slate-950 px-8 py-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1.5 font-ui text-sm text-slate-500 dark:text-slate-400 transition-colors hover:text-sky-600 dark:hover:text-sky-400"
        >
          <BackIcon />
          Back to My Items
        </Link>

        <h1 className="mb-1 font-display text-4xl tracking-wide text-slate-800 dark:text-slate-100">
          Account
        </h1>
        <p className="mb-6 font-ui text-sm text-slate-400 dark:text-slate-500">
          Your account details.
        </p>

        {loading ? (
          <p className="font-ui text-sm text-slate-400 dark:text-slate-500">
            Loading…
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4 rounded-2xl border border-sky-100 dark:border-slate-800 bg-white dark:bg-blue-950 p-6 shadow-sm">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-sky-100 dark:bg-slate-700 font-display text-2xl text-sky-600 dark:text-sky-400">
                {initial}
              </div>
              <div className="min-w-0">
                <p className="truncate font-ui text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {email ?? "No email on file"}
                </p>
                <p className="font-ui text-xs text-slate-400 dark:text-slate-500">
                  Member since {formatDate(createdAt)}
                </p>
              </div>
            </div>

            {plan && (
              <div className="rounded-2xl border border-sky-100 dark:border-slate-800 bg-white dark:bg-blue-950 p-5 shadow-sm">
                <p className="mb-2 font-ui text-xs uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Plan
                </p>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-ui text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {plan.isPro ? "Pro — $10/month" : "Free"}
                    </p>
                    <p className="font-ui text-xs text-slate-400 dark:text-slate-500">
                      {Math.min(plan.used, EXTRACTION_LIMIT)}/{EXTRACTION_LIMIT}{" "}
                      extractions used
                      {plan.isPro
                        ? ` this period · renews ${formatDate(plan.currentPeriodEnd)}`
                        : " (lifetime)"}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={billingLoading}
                    onClick={() =>
                      goToBilling(plan.isPro ? "portal" : "checkout")
                    }
                    className="shrink-0 rounded-full bg-sky-500 px-4 py-2 font-ui text-xs font-semibold text-white shadow-sm transition-colors hover:bg-sky-600 disabled:opacity-60"
                  >
                    {plan.isPro ? "Manage" : "Upgrade — $10/mo"}
                  </button>
                </div>
              </div>
            )}

            {itemTypes.length > 0 && (
              <div className="rounded-2xl border border-sky-100 dark:border-slate-800 bg-white dark:bg-blue-950 p-5 shadow-sm">
                <p className="mb-2 font-ui text-xs uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Things you track
                </p>
                <div className="flex flex-wrap gap-2">
                  {itemTypes.map((type) => (
                    <span
                      key={type}
                      className="rounded-full border border-sky-200 dark:border-slate-700 bg-sky-50 dark:bg-slate-800 px-3 py-1 font-ui text-xs text-sky-600 dark:text-sky-400"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <form action={signout}>
              <button
                type="submit"
                className="w-full rounded-2xl border border-red-200 dark:border-red-900 bg-white dark:bg-blue-950 p-4 text-center font-ui text-sm text-red-500 dark:text-red-400 shadow-sm transition-colors hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                Log out
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
