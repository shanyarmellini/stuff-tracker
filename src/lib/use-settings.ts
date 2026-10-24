"use client";

import { useEffect, useState } from "react";

type AppSettings = {
  dataSharing: boolean;
};

const DEFAULT_SETTINGS: AppSettings = {
  dataSharing: true,
};

const STORAGE_KEY = "stuff-tracker:settings";
const CHANGE_EVENT = "stuff-tracker:settings-change";

// Stored settings may contain keys from older versions of the settings page;
// they're carried along harmlessly and ignored.
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
  // False until the stored settings have been read, so effects don't briefly
  // act on the defaults.
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const handleChange = () => setSettings(readSettings());
    handleChange();
    setLoaded(true);
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

  return { settings, loaded, update };
}
