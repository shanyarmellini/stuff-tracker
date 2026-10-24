"use client";

import { useState } from "react";
import { ChevronDownIcon, ExternalLinkIcon } from "~/components/icons";
import { formatPrice } from "~/lib/format";
import { isValidLink, linkHostname, normalizeUrl } from "~/lib/url";
import { cn } from "~/lib/utils";
import { findCategoryLabel, realCategories } from "../_lib/categories";
import { handlePriceKeyDown } from "../_lib/item-input";
import {
  MODAL_BACKDROP,
  MODAL_PANEL,
  MODAL_TITLE,
  OUTLINE_BUTTON,
  POPOVER_DISMISS,
  POPOVER_PANEL,
} from "../_lib/styles";
import type { Category, EditableItemField, Item } from "../_lib/types";
import { ItemPhoto } from "./item-photo";
import { PhotoPicker } from "./photo-picker";

const UNDERLINED_INPUT =
  "w-full bg-transparent outline-none border-b border-input focus:border-ring";

/** Item details; while editing, fields save to the edit session on blur. */
export function ItemDetailModal({
  item,
  categories,
  isEditing,
  userId,
  photoBroken,
  onPhotoError,
  onEditField,
  onEditPhoto,
  onClose,
}: {
  item: Item;
  categories: Category[];
  isEditing: boolean;
  userId: string | null;
  photoBroken: boolean;
  onPhotoError: () => void;
  onEditField: (
    field: EditableItemField,
    value: string | number | null,
  ) => void;
  onEditPhoto: (photoUrl: string | null, emoji: string | null) => void;
  onClose: () => void;
}) {
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [linkError, setLinkError] = useState(false);
  const categoryLabel = findCategoryLabel(categories, item.category);

  return (
    <div className={MODAL_BACKDROP}>
      <button
        type="button"
        aria-label="Close item details"
        className="fixed inset-0 cursor-default"
        onClick={onClose}
      />
      <div className={cn("relative", MODAL_PANEL)}>
        {isEditing ? (
          <>
            <input
              className={cn("mb-1 pb-1", MODAL_TITLE, UNDERLINED_INPUT)}
              defaultValue={item.name}
              onBlur={(e) => onEditField("name", e.target.value)}
            />
            <CategoryMenu
              categories={categories}
              value={item.category}
              onChange={(id) => onEditField("category", id)}
            />
          </>
        ) : (
          <>
            <h2 className={cn("mb-1", MODAL_TITLE)}>
              {item.name}
              {item.quantity > 1 && (
                <span className="text-subtle-foreground">
                  {" "}
                  ×{item.quantity}
                </span>
              )}
            </h2>
            {item.category && (
              <p className="mb-4 font-ui text-xs uppercase tracking-widest text-subtle-foreground">
                {categoryLabel ?? item.category}
              </p>
            )}
          </>
        )}
        <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-muted">
          {uploadingPhoto ? (
            <p className="font-ui text-sm text-subtle-foreground">Uploading…</p>
          ) : (
            <ItemPhoto
              photoUrl={item.photo_url}
              emoji={item.emoji}
              alt={item.name}
              broken={photoBroken}
              onError={onPhotoError}
              emojiClassName="text-8xl"
            />
          )}
          {isEditing && (
            <PhotoPicker
              userId={userId}
              hasPhoto={Boolean(item.photo_url || item.emoji)}
              onChange={onEditPhoto}
              onUploadingChange={setUploadingPhoto}
              buttonClassName="bottom-2 right-2 h-9 w-9"
              menuClassName="bottom-14 right-2"
            />
          )}
        </div>
        {isEditing ? (
          <div className="mt-4 flex flex-col gap-1">
            <div className="flex items-center gap-0.5">
              <span className="font-ui text-2xl font-semibold text-foreground">
                $
              </span>
              <input
                type="text"
                inputMode="decimal"
                className={cn(
                  "font-ui text-2xl font-semibold text-foreground pb-0.5",
                  UNDERLINED_INPUT,
                )}
                defaultValue={item.price.toFixed(2)}
                onKeyDown={handlePriceKeyDown}
                onBlur={(e) =>
                  onEditField("price", parseFloat(e.target.value) || 0)
                }
              />
            </div>
            <input
              className={cn(
                "w-full bg-transparent font-ui text-sm text-brand outline-none border-b pb-0.5",
                linkError
                  ? "border-destructive focus:border-destructive"
                  : "border-input focus:border-ring",
              )}
              placeholder="Website URL"
              defaultValue={item.link ?? ""}
              onFocus={() => setLinkError(false)}
              onBlur={(e) => {
                const value = e.target.value;
                setLinkError(!isValidLink(value));
                if (isValidLink(value)) onEditField("link", value || null);
                else e.target.value = item.link ?? "";
              }}
            />
            {linkError && (
              <p className="mt-0.5 font-ui text-xs text-destructive">
                Invalid URL
              </p>
            )}
          </div>
        ) : (
          <div className="mt-4 flex items-center justify-between">
            <p className="font-ui text-2xl font-semibold text-foreground">
              {formatPrice(item.price)}
            </p>
            {item.link && (
              <a
                href={normalizeUrl(item.link)}
                target="_blank"
                rel="noreferrer"
                className="flex min-w-0 items-center gap-1 font-ui text-sm text-brand transition-colors hover:text-brand-strong"
              >
                <span className="truncate">{linkHostname(item.link)}</span>
                <ExternalLinkIcon />
              </a>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={onClose}
          className={cn("mt-5 w-full", OUTLINE_BUTTON)}
        >
          Close
        </button>
      </div>
    </div>
  );
}

function CategoryMenu({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: string | null;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative mb-4 inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-ui text-xs uppercase tracking-widest text-brand-strong transition-colors hover:bg-input"
      >
        {findCategoryLabel(categories, value) ?? "Select a category"}
        <ChevronDownIcon className={open ? "rotate-180" : undefined} />
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close category menu"
            className={POPOVER_DISMISS}
            onClick={() => setOpen(false)}
          />
          <div
            className={cn(
              "absolute z-20 mt-1 max-h-40 w-48 overflow-y-auto p-1",
              POPOVER_PANEL,
            )}
          >
            {realCategories(categories).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setOpen(false);
                  onChange(c.id);
                }}
                className={cn(
                  "w-full rounded-lg px-3 py-2 text-left font-ui text-sm transition-colors hover:bg-muted",
                  value === c.id ? "text-brand-strong" : "text-foreground",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
