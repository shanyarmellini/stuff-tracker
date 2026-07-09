"use client";

import { useEffect, useState } from "react";

export type TextSize = "small" | "medium" | "large";
export type EmailDigest = "instant" | "daily" | "weekly" | "none";
export type LayoutView = "grid" | "list";

export type AppSettings = {
  textSize: TextSize;
  highContrast: boolean;
  reducedMotion: boolean;
  layout: LayoutView;
  pushAlerts: boolean;
  emailDigest: EmailDigest;
  inAppBadges: boolean;
  dndEnabled: boolean;
  dndStart: string;
  dndEnd: string;
  dataSharing: boolean;
  cameraAccess: boolean;
  micAccess: boolean;
  locationAccess: boolean;
  hideActiveStatus: boolean;
  currency: string;
  offlineDownloadLimitMb: number;
  autoplay: boolean;
};

export const DEFAULT_SETTINGS: AppSettings = {
  textSize: "medium",
  highContrast: false,
  reducedMotion: false,
  layout: "grid",
  pushAlerts: true,
  emailDigest: "daily",
  inAppBadges: true,
  dndEnabled: false,
  dndStart: "22:00",
  dndEnd: "07:00",
  dataSharing: false,
  cameraAccess: false,
  micAccess: false,
  locationAccess: false,
  hideActiveStatus: false,
  currency: "USD",
  offlineDownloadLimitMb: 500,
  autoplay: true,
};

const STORAGE_KEY = "stuff-tracker:settings";
const CHANGE_EVENT = "stuff-tracker:settings-change";

function readSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(readSettings());
    const handleChange = () => setSettings(readSettings());
    window.addEventListener(CHANGE_EVENT, handleChange);
    window.addEventListener("storage", handleChange);
    return () => {
      window.removeEventListener(CHANGE_EVENT, handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }, []);

  const update = (partial: Partial<AppSettings>) => {
    const next = { ...readSettings(), ...partial };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  return { settings, update };
}
