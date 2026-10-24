"use client";

import { type ReactNode, useEffect, useState, useTransition } from "react";
import packageJson from "~/../package.json";
import {
  DANGER_CARD_BUTTON_CLASS,
  SECTION_CARD_CLASS,
} from "~/components/class-names";
import { SignOutButton } from "~/components/sign-out-button";
import { SubPageShell } from "~/components/sub-page-shell";
import { buttonVariants } from "~/components/ui/button";
import { deleteAccount, deleteUserData } from "./actions";
import { ConfirmDialog } from "./confirm-dialog";

const CONFIRMATIONS = {
  data: {
    message:
      "Are you sure you want to delete your data? This will delete all of your items and your connection with Gmail. We will only have your name and email.",
    action: deleteUserData,
  },
  account: {
    message:
      "Are you sure you want to delete your account? This permanently deletes your account and everything in it. This cannot be undone.",
    action: deleteAccount,
  },
};

type Confirmation = keyof typeof CONFIRMATIONS;

function Section({
  emoji,
  title,
  children,
}: {
  emoji: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className={SECTION_CARD_CLASS}>
      <h2 className="mb-4 font-display text-xl tracking-wide text-foreground">
        <span className="mr-1.5">{emoji}</span>
        {title}
      </h2>
      <div className="flex flex-col divide-y divide-border">{children}</div>
    </div>
  );
}

function Row({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-ui text-sm font-medium text-foreground">{label}</p>
        {description && (
          <p className="font-ui text-xs text-subtle-foreground">
            {description}
          </p>
        )}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}

export default function SettingsPage() {
  const [timeZone, setTimeZone] = useState("");
  const [confirming, setConfirming] = useState<Confirmation | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  function confirm() {
    if (!confirming) return;
    startTransition(async () => {
      await CONFIRMATIONS[confirming].action();
      setConfirming(null);
    });
  }

  return (
    <SubPageShell title="Settings" subtitle="Manage your privacy and app info.">
      <div className="flex flex-col gap-4">
        <Section emoji="🔒" title="Privacy">
          <Row
            label="Delete all data"
            description="Remove your items and Gmail connection"
          >
            <button
              type="button"
              onClick={() => setConfirming("data")}
              className={buttonVariants({ variant: "destructive", size: "sm" })}
            >
              Delete
            </button>
          </Row>
        </Section>

        <Section emoji="📄" title="Support & About">
          <Row label="Time zone" description="Detected from your device">
            <span className="font-ui text-xs text-muted-foreground">
              {timeZone || "—"}
            </span>
          </Row>
          <Row
            label="Help Center"
            description="FAQs and support articles are coming soon"
          >
            <span className="font-ui text-xs text-subtle-foreground">
              Coming soon
            </span>
          </Row>
          <Row label="Legal" description="Privacy Policy and Terms of Service">
            <span className="font-ui text-xs text-subtle-foreground">
              Available in-app soon
            </span>
          </Row>
          <Row
            label="App version"
            description={`Build ${packageJson.version}`}
          />
        </Section>

        <SignOutButton variant="card">🚪 Log out</SignOutButton>
        <button
          type="button"
          onClick={() => setConfirming("account")}
          className={DANGER_CARD_BUTTON_CLASS}
        >
          🗑️ Delete account
        </button>
      </div>

      {confirming && (
        <ConfirmDialog
          message={CONFIRMATIONS[confirming].message}
          pending={pending}
          onConfirm={confirm}
          onCancel={() => setConfirming(null)}
        />
      )}
    </SubPageShell>
  );
}
