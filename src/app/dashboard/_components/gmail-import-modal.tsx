"use client";

import { useState } from "react";
import { ScanningStep } from "~/app/onboarding/scanning-step";
import { VerificationStep } from "~/app/onboarding/verification-step";
import { MODAL_BACKDROP } from "../_lib/styles";

/** Connects Gmail via an app password, then scans the inbox for purchases. */
export function GmailImportModal({
  email,
  onItemsChanged,
  onClose,
}: {
  email: string | null;
  onItemsChanged: () => Promise<void>;
  onClose: () => void;
}) {
  const [isScanning, setIsScanning] = useState(false);

  return (
    <div className={MODAL_BACKDROP}>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <div className="relative z-10">
        {isScanning ? (
          <ScanningStep
            onDone={async () => {
              await onItemsChanged();
              onClose();
            }}
          />
        ) : (
          <VerificationStep
            email={email}
            onVerified={() => setIsScanning(true)}
            onSkipped={onClose}
          />
        )}
      </div>
    </div>
  );
}
