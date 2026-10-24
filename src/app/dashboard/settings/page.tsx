"use client";

import { type ReactNode, useEffect, useState } from "react";
import packageJson from "~/../package.json";
import { SECTION_CARD_CLASS } from "~/components/class-names";
import { SignOutButton } from "~/components/sign-out-button";
import { SubPageShell } from "~/components/sub-page-shell";

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

  useEffect(() => {
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  return (
    <SubPageShell title="Settings" subtitle="Manage your privacy and app info.">
      <div className="flex flex-col gap-4">
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
      </div>
    </SubPageShell>
  );
}
