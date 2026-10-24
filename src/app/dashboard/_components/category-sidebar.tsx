"use client";

import { useState } from "react";
import { CloseIcon } from "~/components/icons";
import { cn } from "~/lib/utils";
import { ALL_CATEGORY_ID, MAX_CATEGORY_LENGTH } from "../_lib/constants";
import {
  CHAR_LIMIT_ERROR,
  SIDEBAR_CATEGORY,
  SIDEBAR_CATEGORY_ACTIVE,
  SIDEBAR_CATEGORY_INACTIVE,
} from "../_lib/styles";
import type { Category } from "../_lib/types";

const CHAR_LIMIT_MESSAGE = `The ${MAX_CATEGORY_LENGTH} character limit has been reached.`;

export function CategorySidebar({
  open,
  onClose,
  categories,
  activeCategory,
  onSelect,
  isEditing,
  onAdd,
  onRename,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  activeCategory: string;
  onSelect: (id: string) => void;
  isEditing: boolean;
  onAdd: (label: string) => void;
  onRename: (category: Category, label: string) => void;
  onDelete: (category: Category) => void;
}) {
  const [renameLength, setRenameLength] = useState(0);

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close categories"
          onClick={onClose}
          className="fixed inset-0 top-14 z-30 bg-black/30 md:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 top-14 left-0 z-40 flex w-64 max-w-[80vw] shrink-0 flex-col overflow-y-auto border-r border-border bg-card transition-transform duration-200 ease-out md:static md:top-auto md:z-auto md:w-56 md:max-w-none md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-3 pt-4 md:hidden">
          <span className="font-display text-sm uppercase tracking-widest text-subtle-foreground">
            Categories
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-subtle-foreground transition-colors hover:bg-muted"
            aria-label="Close categories"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="flex flex-col gap-0.5 px-3 py-6">
          {categories.map((cat) => {
            const active = activeCategory === cat.id;
            const stateClass = active
              ? SIDEBAR_CATEGORY_ACTIVE
              : SIDEBAR_CATEGORY_INACTIVE;
            const editable = isEditing && cat.id !== ALL_CATEGORY_ID;
            return (
              <div key={cat.id} className="flex items-center gap-1">
                {editable ? (
                  <div className="min-w-0 flex-1 flex flex-col">
                    <input
                      type="text"
                      defaultValue={cat.label}
                      maxLength={MAX_CATEGORY_LENGTH}
                      onFocus={(e) => {
                        onSelect(cat.id);
                        setRenameLength(e.target.value.length);
                      }}
                      onChange={(e) => setRenameLength(e.target.value.length)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                      }}
                      onBlur={(e) => {
                        const label = e.target.value.trim();
                        if (label) onRename(cat, label);
                        else e.target.value = cat.label;
                      }}
                      className={cn(
                        "w-full bg-transparent outline-none",
                        SIDEBAR_CATEGORY,
                        stateClass,
                      )}
                    />
                    {active && renameLength >= MAX_CATEGORY_LENGTH && (
                      <p className={cn("px-4", CHAR_LIMIT_ERROR)}>
                        {CHAR_LIMIT_MESSAGE}
                      </p>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelect(cat.id)}
                    className={cn(
                      "min-w-0 flex-1",
                      SIDEBAR_CATEGORY,
                      stateClass,
                    )}
                  >
                    {cat.label}
                  </button>
                )}
                {editable && (
                  <button
                    type="button"
                    onClick={() => onDelete(cat)}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-subtle-foreground transition-colors hover:bg-destructive/10 hover:text-destructive/80"
                    aria-label={`Delete ${cat.label} category`}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
          {isEditing && <NewCategoryInput onAdd={onAdd} />}
        </div>
      </aside>
    </>
  );
}

/** Adds a category on Enter or blur. */
function NewCategoryInput({ onAdd }: { onAdd: (label: string) => void }) {
  const [value, setValue] = useState("");

  const commit = () => {
    const label = value.trim();
    if (!label) return;
    onAdd(label);
    setValue("");
  };

  return (
    <div className="mt-1 flex flex-col gap-0.5 px-4">
      {value.length >= MAX_CATEGORY_LENGTH && (
        <p className={CHAR_LIMIT_ERROR}>{CHAR_LIMIT_MESSAGE}</p>
      )}
      <input
        type="text"
        value={value}
        maxLength={MAX_CATEGORY_LENGTH}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
        }}
        onBlur={commit}
        placeholder="+ Add category"
        className="w-full bg-transparent font-display text-base tracking-wide uppercase text-subtle-foreground outline-none placeholder:text-subtle-foreground"
      />
    </div>
  );
}
