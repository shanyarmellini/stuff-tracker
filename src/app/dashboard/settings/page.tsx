"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { type ReactNode, useEffect, useState } from "react";
import packageJson from "~/../package.json";
import { signout } from "~/app/auth/actions";
import {
  type EmailDigest,
  type LayoutView,
  type TextSize,
  useSettings,
} from "~/lib/use-settings";
import { cn } from "~/lib/utils";

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
    <div className="rounded-2xl border border-sky-100 dark:border-slate-800 bg-white dark:bg-blue-950 p-5 shadow-sm">
      <h2 className="mb-4 font-display text-xl tracking-wide text-slate-800 dark:text-slate-100">
        <span className="mr-1.5">{emoji}</span>
        {title}
      </h2>
      <div className="flex flex-col divide-y divide-sky-50 dark:divide-slate-800">
        {children}
      </div>
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
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-ui text-sm font-medium text-slate-700 dark:text-slate-200">
          {label}
        </p>
        {description && (
          <p className="font-ui text-xs text-slate-400 dark:text-slate-500">
            {description}
          </p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
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
        checked ? "bg-sky-500" : "bg-slate-200 dark:bg-slate-700",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white dark:bg-blue-950 shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-sky-200 dark:border-slate-700 bg-sky-50 dark:bg-slate-800 p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-md px-3 py-1 font-ui text-xs transition-colors",
            value === option.value
              ? "bg-white dark:bg-blue-950 text-sky-600 dark:text-sky-400 shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-sky-200 dark:border-slate-700 bg-white dark:bg-blue-950 px-3 py-1.5 font-ui text-xs text-slate-600 dark:text-slate-300 outline-none focus:border-sky-300 dark:focus:border-sky-600"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

async function requestPermission(
  kind: "camera" | "microphone" | "location",
): Promise<boolean> {
  try {
    if (kind === "location") {
      await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject),
      );
      return true;
    }
    const stream = await navigator.mediaDevices.getUserMedia(
      kind === "camera" ? { video: true } : { audio: true },
    );
    for (const track of stream.getTracks()) track.stop();
    return true;
  } catch {
    return false;
  }
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { settings, update } = useSettings();
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [timeZone, setTimeZone] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  const handleDeviceToggle = async (
    kind: "camera" | "microphone" | "location",
    key: "cameraAccess" | "micAccess" | "locationAccess",
    next: boolean,
  ) => {
    setPermissionError(null);
    if (!next) {
      update({ [key]: false });
      return;
    }
    const granted = await requestPermission(kind);
    if (granted) {
      update({ [key]: true });
    } else {
      setPermissionError(
        `Stuff Tracker couldn't get ${kind} access. Check your browser's site permissions.`,
      );
    }
  };

  const handleCheckForUpdates = () => {
    setCheckingUpdate(true);
    setUpdateMessage(null);
    setTimeout(() => {
      setCheckingUpdate(false);
      setUpdateMessage("You're on the latest version.");
    }, 600);
  };

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
          Settings
        </h1>
        <p className="mb-6 font-ui text-sm text-slate-400 dark:text-slate-500">
          Manage how Stuff Tracker looks and behaves.
        </p>

        <div className="flex flex-col gap-4">
          <Section emoji="🎨" title="Appearance & Display">
            <Row label="Theme" description="Choose your preferred appearance">
              {mounted && (
                <Segmented
                  value={(theme ?? "system") as "light" | "dark" | "system"}
                  onChange={setTheme}
                  options={[
                    { value: "light", label: "Light" },
                    { value: "dark", label: "Dark" },
                    { value: "system", label: "System" },
                  ]}
                />
              )}
            </Row>
            <Row label="Text size" description="Scale text across the app">
              <Segmented<TextSize>
                value={settings.textSize}
                onChange={(textSize) => update({ textSize })}
                options={[
                  { value: "small", label: "Small" },
                  { value: "medium", label: "Medium" },
                  { value: "large", label: "Large" },
                ]}
              />
            </Row>
            <Row
              label="High contrast mode"
              description="Increase contrast for borders and text"
            >
              <Toggle
                label="High contrast mode"
                checked={settings.highContrast}
                onChange={(highContrast) => update({ highContrast })}
              />
            </Row>
            <Row
              label="Reduce motion"
              description="Minimize animations and transitions"
            >
              <Toggle
                label="Reduce motion"
                checked={settings.reducedMotion}
                onChange={(reducedMotion) => update({ reducedMotion })}
              />
            </Row>
            <Row label="Layout" description="How items are displayed">
              <Segmented<LayoutView>
                value={settings.layout}
                onChange={(layout) => update({ layout })}
                options={[
                  { value: "grid", label: "Grid" },
                  { value: "list", label: "List" },
                ]}
              />
            </Row>
          </Section>

          <Section emoji="🔔" title="Notifications">
            <Row
              label="Push alerts"
              description="Mobile and desktop notifications"
            >
              <Toggle
                label="Push alerts"
                checked={settings.pushAlerts}
                onChange={(pushAlerts) => update({ pushAlerts })}
              />
            </Row>
            <Row label="Email digests" description="How often we email you">
              <Select
                value={settings.emailDigest}
                onChange={(value) =>
                  update({ emailDigest: value as EmailDigest })
                }
                options={[
                  { value: "instant", label: "Instant" },
                  { value: "daily", label: "Daily" },
                  { value: "weekly", label: "Weekly" },
                  { value: "none", label: "None" },
                ]}
              />
            </Row>
            <Row label="In-app badges" description="Red dot counters on icons">
              <Toggle
                label="In-app badges"
                checked={settings.inAppBadges}
                onChange={(inAppBadges) => update({ inAppBadges })}
              />
            </Row>
            <Row
              label="Do not disturb"
              description={
                settings.dndEnabled
                  ? `Quiet from ${settings.dndStart} to ${settings.dndEnd}`
                  : "Schedule quiet hours"
              }
            >
              <div className="flex items-center gap-2">
                {settings.dndEnabled && (
                  <>
                    <input
                      type="time"
                      value={settings.dndStart}
                      onChange={(e) => update({ dndStart: e.target.value })}
                      className="rounded-lg border border-sky-200 dark:border-slate-700 bg-white dark:bg-blue-950 px-2 py-1 font-ui text-xs text-slate-600 dark:text-slate-300 outline-none focus:border-sky-300 dark:focus:border-sky-600"
                    />
                    <span className="font-ui text-xs text-slate-400 dark:text-slate-500">
                      to
                    </span>
                    <input
                      type="time"
                      value={settings.dndEnd}
                      onChange={(e) => update({ dndEnd: e.target.value })}
                      className="rounded-lg border border-sky-200 dark:border-slate-700 bg-white dark:bg-blue-950 px-2 py-1 font-ui text-xs text-slate-600 dark:text-slate-300 outline-none focus:border-sky-300 dark:focus:border-sky-600"
                    />
                  </>
                )}
                <Toggle
                  label="Do not disturb"
                  checked={settings.dndEnabled}
                  onChange={(dndEnabled) => update({ dndEnabled })}
                />
              </div>
            </Row>
          </Section>

          <Section emoji="🔒" title="Privacy & Permissions">
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
            <Row label="Camera access" description="Used for scanning items">
              <Toggle
                label="Camera access"
                checked={settings.cameraAccess}
                onChange={(value) =>
                  handleDeviceToggle("camera", "cameraAccess", value)
                }
              />
            </Row>
            <Row
              label="Microphone access"
              description="Used for voice-added items"
            >
              <Toggle
                label="Microphone access"
                checked={settings.micAccess}
                onChange={(value) =>
                  handleDeviceToggle("microphone", "micAccess", value)
                }
              />
            </Row>
            <Row
              label="Location access"
              description="Used to tag where items were bought"
            >
              <Toggle
                label="Location access"
                checked={settings.locationAccess}
                onChange={(value) =>
                  handleDeviceToggle("location", "locationAccess", value)
                }
              />
            </Row>
            {permissionError && (
              <p className="pt-2 font-ui text-xs text-red-500 dark:text-red-400">
                {permissionError}
              </p>
            )}
            <Row
              label="Hide active status"
              description="Stay anonymous to other users"
            >
              <Toggle
                label="Hide active status"
                checked={settings.hideActiveStatus}
                onChange={(hideActiveStatus) => update({ hideActiveStatus })}
              />
            </Row>
          </Section>

          <Section emoji="⚙️" title="Preferences & System">
            <Row label="Language" description="More languages are coming soon">
              <Select
                value="en-US"
                onChange={() => {}}
                options={[{ value: "en-US", label: "English (US)" }]}
              />
            </Row>
            <Row label="Time zone" description="Detected from your device">
              <span className="font-ui text-xs text-slate-500 dark:text-slate-400">
                {timeZone || "—"}
              </span>
            </Row>
            <Row label="Currency" description="Used for prices and totals">
              <Select
                value={settings.currency}
                onChange={(currency) => update({ currency })}
                options={[
                  { value: "USD", label: "USD ($)" },
                  { value: "EUR", label: "EUR (€)" },
                  { value: "GBP", label: "GBP (£)" },
                  { value: "JPY", label: "JPY (¥)" },
                ]}
              />
            </Row>
            <Row
              label="Offline download limit"
              description="Maximum storage for offline photos"
            >
              <Select
                value={String(settings.offlineDownloadLimitMb)}
                onChange={(value) =>
                  update({ offlineDownloadLimitMb: Number(value) })
                }
                options={[
                  { value: "100", label: "100 MB" },
                  { value: "500", label: "500 MB" },
                  { value: "1000", label: "1 GB" },
                  { value: "5000", label: "5 GB" },
                ]}
              />
            </Row>
            <Row
              label="Autoplay"
              description="Automatically play videos and GIFs"
            >
              <Toggle
                label="Autoplay"
                checked={settings.autoplay}
                onChange={(autoplay) => update({ autoplay })}
              />
            </Row>
          </Section>

          <Section emoji="📄" title="Support & About">
            <Row
              label="Help Center"
              description="FAQs and support articles are coming soon"
            >
              <span className="font-ui text-xs text-slate-400 dark:text-slate-500">
                Coming soon
              </span>
            </Row>
            <Row
              label="Legal"
              description="Privacy Policy and Terms of Service"
            >
              <span className="font-ui text-xs text-slate-400 dark:text-slate-500">
                Available in-app soon
              </span>
            </Row>
            <Row
              label="App version"
              description={
                updateMessage ??
                `Build ${packageJson.version}${checkingUpdate ? " — checking…" : ""}`
              }
            >
              <button
                type="button"
                onClick={handleCheckForUpdates}
                disabled={checkingUpdate}
                className="rounded-lg border border-sky-200 dark:border-slate-700 bg-white dark:bg-blue-950 px-3 py-1.5 font-ui text-xs text-sky-600 dark:text-sky-400 transition-colors hover:bg-sky-50 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {checkingUpdate ? "Checking…" : "Check for updates"}
              </button>
            </Row>
          </Section>

          <form action={signout}>
            <button
              type="submit"
              className="w-full rounded-2xl border border-red-200 dark:border-red-900 bg-white dark:bg-blue-950 p-4 text-center font-ui text-sm text-red-500 dark:text-red-400 shadow-sm transition-colors hover:bg-red-50 dark:hover:bg-red-950/40"
            >
              🚪 Log out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
