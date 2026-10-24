import type { KeyboardEvent } from "react";
import { createClient } from "~/lib/supabase/client";
import { ITEM_PHOTOS_BUCKET, MAX_PRICE_DIGITS } from "./constants";

const PRICE_NAV_KEYS = [
  "Backspace",
  "Delete",
  "ArrowLeft",
  "ArrowRight",
  "Tab",
  "Enter",
];

/** Restricts a text input to a decimal price of at most MAX_PRICE_DIGITS. */
export function handlePriceKeyDown(e: KeyboardEvent<HTMLInputElement>) {
  if (PRICE_NAV_KEYS.includes(e.key)) return;
  const value = e.currentTarget.value;
  if (e.key === ".") {
    if (value.includes(".")) e.preventDefault();
    return;
  }
  if (!/^\d$/.test(e.key) || value.replace(".", "").length >= MAX_PRICE_DIGITS)
    e.preventDefault();
}

/** Uploads to the item-photos bucket; returns the public URL or null. */
export async function uploadItemPhoto(
  file: File,
  userId: string,
): Promise<string | null> {
  const storage = createClient().storage.from(ITEM_PHOTOS_BUCKET);
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await storage.upload(path, file);
  if (error) {
    console.error("Failed to upload photo:", error.message);
    return null;
  }
  return storage.getPublicUrl(path).data.publicUrl;
}
