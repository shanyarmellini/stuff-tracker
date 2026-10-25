"use client";

import { useState } from "react";
import {
  FIELD_INPUT_CLASS,
  ONBOARDING_CARD_CLASS,
  ONBOARDING_TITLE_CLASS,
  SUBMIT_BUTTON_CLASS,
} from "~/components/class-names";
import {
  MAX_OTHER_CATEGORY_LENGTH,
  MAX_SCAN_CATEGORIES,
  SCAN_CATEGORIES,
} from "~/lib/categories/taxonomy";
import type { SaveScanCategoriesResult } from "~/lib/profile/onboarding";
import { cn } from "~/lib/utils";
import { saveScanCategories } from "./actions";

function cardClass(active: boolean, disabled: boolean) {
  return cn(
    "rounded-xl border px-4 py-3 text-left transition-colors",
    active
      ? "border-brand bg-brand text-brand-foreground"
      : "border-input bg-card text-foreground hover:border-brand",
    disabled && "cursor-not-allowed opacity-40 hover:border-input",
  );
}

function cardHintClass(active: boolean) {
  return cn(
    "block font-ui text-xs",
    active ? "text-brand-foreground/80" : "text-subtle-foreground",
  );
}

export function CategoriesStep({
  onDone,
  save = saveScanCategories,
}: {
  onDone: () => void;
  // Where the picks are saved; the admin mock onboarding saves to another
  // user instead of the signed-in one.
  save?: (categories: string[]) => Promise<SaveScanCategoriesResult>;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  // Each typed "Other" name counts as one of the picks and is saved as a
  // category of its own.
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherItems, setOtherItems] = useState<string[]>([]);
  const [otherText, setOtherText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const pickedCount = selected.length + otherItems.length;
  const maxed = pickedCount >= MAX_SCAN_CATEGORIES;
  const otherActive = otherOpen || otherItems.length > 0;

  function toggle(id: string) {
    setError(null);
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((c) => c !== id);
      if (maxed) return prev;
      return [...prev, id];
    });
  }

  function toggleOther() {
    setError(null);
    if (otherActive) {
      setOtherOpen(false);
      setOtherItems([]);
      setOtherText("");
    } else if (!maxed) {
      setOtherOpen(true);
    }
  }

  /**
   * Adds the typed name as a pick (a listed category's name selects that
   * category instead). Returns the picks it leads to, or null if it can't be
   * added.
   */
  function addOther(): { selected: string[]; otherItems: string[] } | null {
    const name = otherText.trim();
    const current = { selected, otherItems };
    if (!name) return current;

    const lower = name.toLowerCase();
    const listed = SCAN_CATEGORIES.find(
      (c) => c.id === lower || c.label.toLowerCase() === lower,
    );
    const alreadyPicked = listed
      ? selected.includes(listed.id)
      : otherItems.some((item) => item.toLowerCase() === lower);
    if (alreadyPicked) {
      setOtherText("");
      return current;
    }
    if (maxed) {
      setError(`You can pick up to ${MAX_SCAN_CATEGORIES} categories.`);
      return null;
    }

    const next = listed
      ? { selected: [...selected, listed.id], otherItems }
      : { selected, otherItems: [...otherItems, name] };
    setSelected(next.selected);
    setOtherItems(next.otherItems);
    setOtherText("");
    return next;
  }

  function removeOther(item: string) {
    setError(null);
    setOtherItems((prev) => prev.filter((i) => i !== item));
  }

  async function handleContinue() {
    // Text still in the box counts, so it isn't lost by not pressing Add.
    const next = addOther();
    if (!next) return;
    if (
      otherOpen &&
      next.otherItems.length === 0 &&
      next.selected.length === 0
    ) {
      setError("Type what you want to track under Other, or unselect it.");
      return;
    }
    const picks = [...next.selected, ...next.otherItems];
    if (picks.length === 0) {
      setError("Please pick at least one category.");
      return;
    }
    setSaving(true);
    const result = await save(picks).catch(() => ({
      ok: false as const,
      error: "Failed to save your categories.",
    }));
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onDone();
  }

  return (
    <div className={ONBOARDING_CARD_CLASS}>
      <h1 className={ONBOARDING_TITLE_CLASS}>What do you want to track?</h1>
      <p className="mb-6 font-ui text-sm text-subtle-foreground">
        Pick up to {MAX_SCAN_CATEGORIES} categories. We only scan your inbox for
        purchases in these, so anything else (like ride receipts, if you
        don&apos;t pick Transportation) won&apos;t be imported.
      </p>

      <div className="mb-2 grid gap-2 sm:grid-cols-2">
        {SCAN_CATEGORIES.map((category) => {
          const active = selected.includes(category.id);
          const disabled = !active && maxed;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => toggle(category.id)}
              disabled={disabled}
              aria-pressed={active}
              className={cardClass(active, disabled)}
            >
              <span className="block font-ui text-sm font-medium">
                {category.label}
              </span>
              <span className={cardHintClass(active)}>
                {category.subcategories.join(", ")}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={toggleOther}
          disabled={!otherActive && maxed}
          aria-pressed={otherActive}
          className={cardClass(otherActive, !otherActive && maxed)}
        >
          <span className="block font-ui text-sm font-medium">Other</span>
          <span className={cardHintClass(otherActive)}>
            Something else? Type in as many as you like.
          </span>
        </button>
      </div>

      {otherActive && (
        <div className="mb-2">
          {otherItems.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {otherItems.map((item) => (
                <span
                  key={item}
                  className="flex items-center gap-1.5 rounded-full border border-brand bg-brand px-3 py-1 font-ui text-sm text-brand-foreground"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() => removeOther(item)}
                    className="leading-none opacity-70 hover:opacity-100"
                    aria-label={`Remove ${item}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              // biome-ignore lint/a11y/noAutofocus: appears right after the user picks Other
              autoFocus
              aria-label="Other category"
              placeholder="e.g. Pet supplies"
              maxLength={MAX_OTHER_CATEGORY_LENGTH}
              value={otherText}
              disabled={maxed}
              onChange={(e) => {
                setError(null);
                setOtherText(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addOther();
                }
              }}
              className={cn(FIELD_INPUT_CLASS, "min-w-0 flex-1 px-4")}
            />
            <button
              type="button"
              onClick={() => addOther()}
              disabled={maxed || !otherText.trim()}
              className="rounded-xl border border-input bg-card px-4 py-2.5 font-ui text-sm text-muted-foreground transition-colors hover:border-brand hover:text-brand-strong disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-input disabled:hover:text-muted-foreground"
            >
              Add
            </button>
          </div>
        </div>
      )}

      <p className="mb-4 font-ui text-xs text-subtle-foreground">
        {pickedCount} of {MAX_SCAN_CATEGORIES} picked. You can rename or add
        categories later on your dashboard.
      </p>
      {error && (
        <p className="mb-2 font-ui text-xs text-destructive">{error}</p>
      )}

      <button
        type="button"
        onClick={handleContinue}
        disabled={saving}
        className={SUBMIT_BUTTON_CLASS}
      >
        {saving ? "Saving…" : "Continue"}
      </button>
    </div>
  );
}
