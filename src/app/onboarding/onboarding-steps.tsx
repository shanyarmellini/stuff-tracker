"use client";

import { useState } from "react";
import { CategoriesStep } from "./categories-step";
import { OnboardingForm } from "./onboarding-form";
import { ScanningStep } from "./scanning-step";
import { VerificationStep } from "./verification-step";

// Categories come first: the scan only looks for purchases in them.
type Step = "categories" | "verify" | "scanning" | "form";

export function OnboardingSteps({ email }: { email: string | null }) {
  const [step, setStep] = useState<Step>("categories");

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center bg-muted px-4">
      {step === "categories" && (
        <CategoriesStep onDone={() => setStep("verify")} />
      )}
      {step === "verify" && (
        <VerificationStep
          email={email}
          onVerified={() => setStep("scanning")}
          onSkipped={() => setStep("form")}
        />
      )}
      {step === "scanning" && <ScanningStep onDone={() => setStep("form")} />}
      {step === "form" && <OnboardingForm />}
    </div>
  );
}
