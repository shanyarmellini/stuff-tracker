"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon, PlusIcon } from "~/components/icons";
import { cn } from "~/lib/utils";
import {
  categoryIdFor,
  findCategoryLabel,
  realCategories,
} from "../_lib/categories";
import { MAX_CATEGORY_LENGTH } from "../_lib/constants";
import {
  CHAR_LIMIT_ERROR,
  POPOVER_DISMISS,
  POPOVER_PANEL,
} from "../_lib/styles";
import type { Category } from "../_lib/types";

/**
 * Searchable category dropdown that can also create a category. A new
 * category is reported as `pendingLabel` and only persisted by the caller.
 */
export function CategorySelect({
  categories,
  value,
  pendingLabel,
  onChange,
}: {
  categories: Category[];
  value: string;
  pendingLabel: string | null;
  onChange: (id: string, pendingLabel: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const newLabelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (creating) newLabelInputRef.current?.focus();
  }, [creating]);

  const stopCreating = () => {
    setCreating(false);
    setNewLabel("");
  };

  const close = () => {
    setOpen(false);
    setSearch("");
    stopCreating();
  };

  const select = (id: string, label: string | null) => {
    onChange(id, label);
    setOpen(false);
    setSearch("");
  };

  const createCategory = () => {
    const label = newLabel.trim();
    if (!label) return;
    const id = categoryIdFor(label);
    select(id, categories.some((c) => c.id === id) ? null : label);
    stopCreating();
  };

  const matches = realCategories(categories).filter((c) =>
    c.label.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="relative mt-1">
      {open && (
        <button
          type="button"
          aria-label="Close category dropdown"
          className={POPOVER_DISMISS}
          onClick={close}
        />
      )}
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          stopCreating();
        }}
        className="flex w-full items-center justify-between rounded-xl border border-input px-3 py-2 font-ui text-sm transition-all hover:border-ring focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
      >
        <span className={value ? "text-foreground" : "text-subtle-foreground"}>
          {value
            ? (findCategoryLabel(categories, value) ?? pendingLabel ?? value)
            : "Select a category"}
        </span>
        <ChevronDownIcon className={open ? "rotate-180" : undefined} />
      </button>
      {open && (
        <div className={cn("absolute z-10 mt-1 w-full", POPOVER_PANEL)}>
          <div className="p-1.5">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setOpen(false);
                  setSearch("");
                }
              }}
              placeholder="Search category…"
              className="w-full rounded-lg border border-border px-2.5 py-1.5 font-ui text-sm text-foreground outline-none focus:border-ring"
            />
          </div>
          <div className="max-h-40 overflow-y-auto">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setCreating(true)}
              className="flex w-full items-center gap-1.5 border-b border-border px-3 py-2 text-left font-ui text-sm text-brand-strong transition-colors hover:bg-muted"
            >
              <PlusIcon />
              New category
            </button>
            {creating && (
              <div className="border-b border-border p-1.5">
                {newLabel.length >= MAX_CATEGORY_LENGTH && (
                  <p className={cn("mb-1", CHAR_LIMIT_ERROR)}>
                    The {MAX_CATEGORY_LENGTH} character limit has been reached.
                  </p>
                )}
                <input
                  type="text"
                  ref={newLabelInputRef}
                  value={newLabel}
                  maxLength={MAX_CATEGORY_LENGTH}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") createCategory();
                    if (e.key === "Escape") stopCreating();
                  }}
                  onBlur={stopCreating}
                  placeholder="New category name"
                  className="w-full rounded-lg border border-input px-2.5 py-1.5 font-ui text-sm text-foreground outline-none focus:border-ring"
                />
              </div>
            )}
            {matches.map((c) => (
              <button
                key={c.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(c.id, null)}
                className={cn(
                  "w-full px-3 py-2 text-left font-ui text-sm transition-colors hover:bg-muted",
                  value === c.id ? "text-brand-strong" : "text-foreground",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
