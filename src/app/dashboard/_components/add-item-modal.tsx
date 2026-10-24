"use client";

import { useState } from "react";
import { createClient } from "~/lib/supabase/client";
import { isValidLink } from "~/lib/url";
import { cn } from "~/lib/utils";
import { handlePriceKeyDown } from "../_lib/item-input";
import {
  FIELD_LABEL,
  MODAL_BACKDROP,
  MODAL_PANEL,
  MODAL_TITLE,
  OUTLINE_BUTTON,
  PRIMARY_BUTTON,
} from "../_lib/styles";
import type { Category, Item } from "../_lib/types";
import { CategorySelect } from "./category-select";
import { ItemPhoto } from "./item-photo";
import { PhotoPicker } from "./photo-picker";

const INPUT =
  "mt-1 w-full rounded-xl border px-3 py-2 font-ui text-sm outline-none transition-all";
const INPUT_OK =
  "border-input focus:border-ring focus:ring-2 focus:ring-ring/30";

export function AddItemModal({
  userId,
  categories,
  sortOrder,
  onAdded,
  onClose,
}: {
  userId: string | null;
  categories: Category[];
  /** sort_order for the new item (it goes first). */
  sortOrder: number;
  onAdded: (item: Item, newCategory: Category | null) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [link, setLink] = useState("");
  const [category, setCategory] = useState("");
  const [pendingCategoryLabel, setPendingCategoryLabel] = useState<
    string | null
  >(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [emoji, setEmoji] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [linkError, setLinkError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = Boolean(
    name.trim() && category && userId && !linkError && !submitting,
  );

  const submit = async () => {
    if (!canSubmit || !userId) return;
    if (link.trim() && !isValidLink(link.trim())) {
      setLinkError(true);
      return;
    }
    setSubmitting(true);
    const { data, error } = await createClient()
      .from("items")
      .insert({
        user_id: userId,
        name: name.trim(),
        price: parseFloat(price) || 0,
        link: link.trim() || null,
        category: category || null,
        sort_order: sortOrder,
        photo_url: photoUrl,
        emoji,
      })
      .select()
      .single();
    if (error) {
      console.error("Failed to add item:", error.message);
      setSubmitting(false);
      return;
    }
    if (data) {
      const isNewCategory =
        pendingCategoryLabel && !categories.some((c) => c.id === category);
      onAdded(
        data as Item,
        isNewCategory ? { id: category, label: pendingCategoryLabel } : null,
      );
    }
    onClose();
  };

  return (
    <div className={MODAL_BACKDROP}>
      <div className={MODAL_PANEL}>
        <h2 className={cn("mb-4", MODAL_TITLE)}>Add Item</h2>
        <div className="flex flex-col gap-3">
          <div>
            <p className={FIELD_LABEL}>Name</p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              className={cn(INPUT, INPUT_OK, "text-foreground")}
              placeholder="Item name"
            />
          </div>
          <div>
            <p className={FIELD_LABEL}>Photo</p>
            <div className="relative mt-1 h-20 w-20">
              <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-xl bg-muted">
                {uploadingPhoto ? (
                  <p className="font-ui text-[10px] text-subtle-foreground">
                    Uploading…
                  </p>
                ) : (
                  <ItemPhoto
                    photoUrl={photoUrl}
                    emoji={emoji}
                    alt="Item preview"
                    emojiClassName="text-3xl"
                  />
                )}
              </div>
              <PhotoPicker
                userId={userId}
                hasPhoto={Boolean(photoUrl || emoji)}
                onChange={(nextPhotoUrl, nextEmoji) => {
                  setPhotoUrl(nextPhotoUrl);
                  setEmoji(nextEmoji);
                }}
                onUploadingChange={setUploadingPhoto}
                buttonClassName="-bottom-1.5 -right-1.5 h-7 w-7"
                menuClassName="left-0 top-full mt-2"
              />
            </div>
          </div>
          <div>
            <p className={FIELD_LABEL}>Price</p>
            <div className="mt-1 flex items-center gap-1 rounded-xl border border-input px-3 py-2 transition-all focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
              <span className="font-ui text-sm text-subtle-foreground">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                onKeyDown={handlePriceKeyDown}
                className="w-full bg-transparent font-ui text-sm text-foreground outline-none"
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <p className={FIELD_LABEL}>Link</p>
            <input
              type="text"
              value={link}
              onChange={(e) => {
                setLink(e.target.value);
                setLinkError(false);
              }}
              onBlur={(e) => {
                const v = e.target.value.trim();
                setLinkError(!!v && !isValidLink(v));
              }}
              className={cn(
                INPUT,
                "text-brand",
                linkError
                  ? "border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/30"
                  : INPUT_OK,
              )}
              placeholder="amazon.com"
            />
            {linkError && (
              <p className="mt-1 font-ui text-xs text-destructive">
                Please enter a valid URL (e.g. amazon.com)
              </p>
            )}
          </div>
          <div>
            <p className={FIELD_LABEL}>Category</p>
            <CategorySelect
              categories={categories}
              value={category}
              pendingLabel={pendingCategoryLabel}
              onChange={(id, pendingLabel) => {
                setCategory(id);
                setPendingCategoryLabel(pendingLabel);
              }}
            />
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className={cn("flex-1", OUTLINE_BUTTON)}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className={cn(
              "flex-1 py-2.5 disabled:cursor-not-allowed disabled:opacity-40",
              PRIMARY_BUTTON,
            )}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
