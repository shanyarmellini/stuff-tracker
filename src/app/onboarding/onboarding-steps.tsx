"use client";

import { useState } from "react";
import { OnboardingForm } from "./onboarding-form";
import { VerificationStep } from "./verification-step";

export function OnboardingSteps({ email }: { email: string | null }) {
  const [verified, setVerified] = useState(false);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center bg-sky-50 px-4">
      {verified ? (
        <OnboardingForm />
      ) : (
        <VerificationStep email={email} onVerified={() => setVerified(true)} />
      )}
    </div>
  );
}
