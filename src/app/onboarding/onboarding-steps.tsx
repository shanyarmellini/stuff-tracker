"use client";

import { useState } from "react";
import { OnboardingForm } from "./onboarding-form";
import { ScanningStep } from "./scanning-step";
import { VerificationStep } from "./verification-step";

type Step = "verify" | "scanning" | "form";

export function OnboardingSteps({ email }: { email: string | null }) {
  const [step, setStep] = useState<Step>("verify");

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center bg-sky-50 px-4">
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
