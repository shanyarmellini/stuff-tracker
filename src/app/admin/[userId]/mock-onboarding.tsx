"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MODAL_BACKDROP } from "~/app/dashboard/_lib/styles";
import { CategoriesStep } from "~/app/onboarding/categories-step";
import { OnboardingForm } from "~/app/onboarding/onboarding-form";
import { Button } from "~/components/ui/button";
import { SCAN_CATEGORIES } from "~/lib/categories/taxonomy";
import type { SaveScanCategoriesResult } from "~/lib/profile/onboarding";
import { errorMessage } from "~/lib/utils";

async function postMockOnboarding(
  body: Record<string, unknown>,
): Promise<SaveScanCategoriesResult> {
  try {
    const res = await fetch("/api/admin/mock-onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return { ok: true };
    const { error } = (await res.json()) as { error?: string };
    return { ok: false, error: error ?? "Save failed" };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

function categoryLabel(id: string): string {
  return SCAN_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

/**
 * Lets an admin fill out onboarding on a user's behalf (skipping the Gmail
 * App Password step) and saves it to that user's profile, so the scan
 * testers below run with those scan categories.
 */
export function MockOnboarding({
  userId,
  scanCategories,
}: {
  userId: string;
  scanCategories: string[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<"closed" | "categories" | "details">(
    "closed",
  );
  const [error, setError] = useState<string | null>(null);

  function close() {
    setStep("closed");
    setError(null);
    // Picks up the newly saved scan categories.
    router.refresh();
  }

  async function saveDetails(formData: FormData) {
    const result = await postMockOnboarding({
      step: "details",
      userId,
      gender: formData.get("gender"),
      age: formData.get("age"),
    });
    if (result.ok) close();
    else setError(result.error);
  }

  return (
    <div className="mb-6 rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg tracking-wide text-foreground">
            Mock onboarding
          </h2>
          <p className="font-ui text-xs text-subtle-foreground">
            Fill out onboarding for this user, skipping the Gmail App Password
            step, and save it to their profile. This replaces their scan
            categories and dashboard categories (and gender/age if you finish
            the second step), so the scan tests below use your picks.
          </p>
          <p className="mt-1 font-ui text-xs text-foreground">
            Current scan categories:{" "}
            {scanCategories.length > 0
              ? scanCategories.map(categoryLabel).join(", ")
              : "none (scanning isn't limited)"}
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setStep("categories")}
          className="shrink-0 rounded-full font-ui"
        >
          Start mock onboarding
        </Button>
      </div>

      {step !== "closed" && (
        <div className={MODAL_BACKDROP}>
          <div
            role="dialog"
            aria-modal="true"
            className="flex max-h-[90vh] w-full max-w-lg flex-col gap-2 overflow-y-auto px-4"
          >
            <div className="flex items-center justify-between font-ui text-xs text-subtle-foreground">
              <span>
                Mock onboarding · step {step === "categories" ? 1 : 2} of 2
              </span>
              <button
                type="button"
                onClick={close}
                className="rounded-full border border-border bg-card px-3 py-1 text-foreground hover:border-brand"
              >
                {step === "categories" ? "Cancel" : "Skip and close"}
              </button>
            </div>
            {error && (
              <p className="font-ui text-xs text-destructive">{error}</p>
            )}
            {step === "categories" ? (
              <CategoriesStep
                save={(categories) =>
                  postMockOnboarding({ step: "categories", userId, categories })
                }
                onDone={() => setStep("details")}
              />
            ) : (
              <OnboardingForm onSubmit={saveDetails} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
