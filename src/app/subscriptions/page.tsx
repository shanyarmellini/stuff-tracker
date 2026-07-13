"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "~/lib/supabase/client";
import { cn } from "~/lib/utils";

const EXTRACTION_LIMIT = 250;

function formatDate(iso: string | undefined | null) {
  if (!iso) return "Unknown";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

type PlanInfo = {
  isPro: boolean;
  used: number;
  currentPeriodEnd: string | null;
};

export default function SubscriptionsPage() {
  const [signedIn, setSignedIn] = useState(false);
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
      setSignedIn(true);

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

  const isPro = plan?.isPro ?? false;

  return (
    <div className="min-h-screen bg-sky-50/40 dark:bg-slate-950 px-8 py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-2 font-display text-4xl tracking-wide text-slate-800 dark:text-slate-100">
          Plans &amp; Pricing
        </h1>
        <p className="mb-10 font-ui text-sm text-slate-400 dark:text-slate-500">
          Every plan includes AI-powered email extraction.
        </p>

        {loading ? (
          <p className="font-ui text-sm text-slate-400 dark:text-slate-500">
            Loading…
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            <div
              className={cn(
                "flex flex-col gap-4 rounded-2xl border bg-white dark:bg-blue-950 p-6 shadow-sm",
                !isPro && signedIn
                  ? "border-sky-300 dark:border-sky-700"
                  : "border-sky-100 dark:border-slate-800",
              )}
            >
              <div>
                <p className="font-ui text-xs uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Free
                </p>
                <p className="mt-1 font-display text-3xl text-slate-800 dark:text-slate-100">
                  $0
                </p>
              </div>
              <ul className="flex flex-1 flex-col gap-2 font-ui text-sm text-slate-600 dark:text-slate-300">
                <li>250 AI email extractions (lifetime)</li>
                <li>Up to 20 items per email</li>
                <li>Unlimited manual items</li>
              </ul>
              {signedIn && !isPro ? (
                <div className="rounded-full border border-sky-200 dark:border-slate-700 bg-sky-50 dark:bg-slate-800 px-4 py-2 text-center font-ui text-xs font-semibold text-sky-600 dark:text-sky-400">
                  Current plan
                  {plan &&
                    ` — ${Math.min(plan.used, EXTRACTION_LIMIT)}/${EXTRACTION_LIMIT} used`}
                </div>
              ) : (
                !signedIn && (
                  <Link
                    href="/auth/signup"
                    className="rounded-full border border-sky-200 dark:border-slate-700 bg-sky-50 dark:bg-slate-800 px-4 py-2 text-center font-ui text-xs font-semibold text-sky-600 dark:text-sky-400 transition-colors hover:bg-sky-100 dark:hover:bg-slate-700"
                  >
                    Sign up free
                  </Link>
                )
              )}
            </div>

            <div
              className={cn(
                "flex flex-col gap-4 rounded-2xl border bg-white dark:bg-blue-950 p-6 shadow-sm",
                isPro
                  ? "border-sky-300 dark:border-sky-700"
                  : "border-sky-100 dark:border-slate-800",
              )}
            >
              <div>
                <p className="font-ui text-xs uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Pro
                </p>
                <p className="mt-1 font-display text-3xl text-slate-800 dark:text-slate-100">
                  $9.99
                  <span className="font-ui text-sm text-slate-400 dark:text-slate-500">
                    /month
                  </span>
                </p>
              </div>
              <ul className="flex flex-1 flex-col gap-2 font-ui text-sm text-slate-600 dark:text-slate-300">
                <li>250 AI email extractions every month</li>
                <li>Up to 40 items per email</li>
                <li>Quota resets automatically each billing period</li>
              </ul>
              {signedIn ? (
                isPro ? (
                  <div className="flex flex-col gap-2">
                    <div className="rounded-full border border-sky-200 dark:border-slate-700 bg-sky-50 dark:bg-slate-800 px-4 py-2 text-center font-ui text-xs font-semibold text-sky-600 dark:text-sky-400">
                      Current plan
                      {plan &&
                        ` — ${Math.min(plan.used, EXTRACTION_LIMIT)}/${EXTRACTION_LIMIT} used, renews ${formatDate(plan.currentPeriodEnd)}`}
                    </div>
                    <button
                      type="button"
                      disabled={billingLoading}
                      onClick={() => goToBilling("portal")}
                      className="rounded-full bg-sky-500 px-4 py-2 font-ui text-xs font-semibold text-white shadow-sm transition-colors hover:bg-sky-600 disabled:opacity-60"
                    >
                      Manage subscription
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={billingLoading}
                    onClick={() => goToBilling("checkout")}
                    className="rounded-full bg-sky-500 px-4 py-2 font-ui text-xs font-semibold text-white shadow-sm transition-colors hover:bg-sky-600 disabled:opacity-60"
                  >
                    Upgrade — $9.99/mo
                  </button>
                )
              ) : (
                <Link
                  href="/auth/signup"
                  className="rounded-full bg-sky-500 px-4 py-2 text-center font-ui text-xs font-semibold text-white shadow-sm transition-colors hover:bg-sky-600"
                >
                  Sign up to upgrade
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
