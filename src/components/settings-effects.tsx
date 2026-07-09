"use client";

import { useEffect } from "react";
import { type TextSize, useSettings } from "~/lib/use-settings";

const FONT_SCALE: Record<TextSize, string> = {
  small: "93.75%",
  medium: "100%",
  large: "112.5%",
};

export function SettingsEffects() {
  const { settings } = useSettings();

  useEffect(() => {
    document.documentElement.style.fontSize = FONT_SCALE[settings.textSize];
  }, [settings.textSize]);

  useEffect(() => {
    document.documentElement.classList.toggle(
      "high-contrast",
      settings.highContrast,
    );
  }, [settings.highContrast]);

  useEffect(() => {
    document.documentElement.classList.toggle(
      "motion-reduce-all",
      settings.reducedMotion,
    );
  }, [settings.reducedMotion]);

  return null;
}
