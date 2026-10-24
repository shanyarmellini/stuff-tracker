"use client";

import { type ReactNode, useEffect, useState } from "react";
import packageJson from "~/../package.json";
import { SECTION_CARD_CLASS } from "~/components/class-names";
import { SignOutButton } from "~/components/sign-out-button";
import { SubPageShell } from "~/components/sub-page-shell";
import { useSettings } from "~/lib/use-settings";
import { cn } from "~/lib/utils";

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

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors",
        checked ? "bg-brand" : "bg-input",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-card shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { settings, update } = useSettings();
  const [timeZone, setTimeZone] = useState("");

  useEffect(() => {
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  return (
    <SubPageShell title="Settings" subtitle="Manage your privacy and app info.">
      <div className="flex flex-col gap-4">
        <Section emoji="🔒" title="Privacy">
          <Row
            label="Data sharing"
            description="Share anonymous usage data to help us improve"
          >
            <Toggle
              label="Data sharing"
              checked={settings.dataSharing}
              onChange={(dataSharing) => update({ dataSharing })}
            />
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
      </div>
    </SubPageShell>
  );
}
