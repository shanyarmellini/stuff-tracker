"use client";

import { useRef, useState } from "react";
import { PencilIcon } from "~/components/icons";
import { isValidLink, loadsAsImage, normalizeUrl } from "~/lib/url";
import { useIsMobileDevice } from "~/lib/use-is-mobile-device";
import { cn } from "~/lib/utils";
import { EMOJI_OPTIONS } from "../_lib/constants";
import { uploadItemPhoto } from "../_lib/item-input";
import { MENU_ITEM, POPOVER_DISMISS, POPOVER_PANEL } from "../_lib/styles";

type Mode = "menu" | "url" | "emoji";

/**
 * Pencil button + popover for changing an item's photo: paste a URL, upload,
 * take a photo (mobile), pick an emoji, or remove it.
 */
export function PhotoPicker({
  userId,
  hasPhoto,
  onChange,
  onUploadingChange,
  buttonClassName,
  menuClassName,
}: {
  userId: string | null;
  hasPhoto: boolean;
  onChange: (photoUrl: string | null, emoji: string | null) => void;
  onUploadingChange: (uploading: boolean) => void;
  buttonClassName: string;
  menuClassName: string;
}) {
  const isMobileDevice = useIsMobileDevice();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("menu");
  const [urlValue, setUrlValue] = useState("");
  const [urlError, setUrlError] = useState(false);
  const [checking, setChecking] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const close = () => {
    setOpen(false);
    setMode("menu");
  };

  const handleFile = async (file: File | undefined) => {
    if (!file || !userId) return;
    setOpen(false);
    onUploadingChange(true);
    const publicUrl = await uploadItemPhoto(file, userId);
    if (publicUrl) onChange(publicUrl, null);
    onUploadingChange(false);
  };

  const closeUrlInput = () => {
    setMode("menu");
    setUrlValue("");
    setUrlError(false);
  };

  const saveUrl = async () => {
    if (checking) return;
    const value = urlValue.trim();
    if (!value) return;
    if (!isValidLink(value)) {
      setUrlError(true);
      return;
    }
    const normalized = normalizeUrl(value);
    setChecking(true);
    const ok = await loadsAsImage(normalized);
    setChecking(false);
    if (!ok) {
      setUrlError(true);
      return;
    }
    onChange(normalized, null);
    closeUrlInput();
    setOpen(false);
  };

  const fileInput = (ref: typeof uploadInputRef, capture?: "environment") => (
    <input
      ref={ref}
      type="file"
      accept="image/*"
      capture={capture}
      className="hidden"
      onChange={(e) => {
        handleFile(e.target.files?.[0]);
        e.target.value = "";
      }}
    />
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "absolute z-10 flex items-center justify-center rounded-full bg-card text-muted-foreground shadow-md transition-colors hover:bg-muted hover:text-brand-strong",
          buttonClassName,
        )}
        aria-label="Edit photo"
      >
        <PencilIcon />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close photo menu"
            className={POPOVER_DISMISS}
            onClick={close}
          />
          <div
            className={cn(
              "absolute z-20 w-48 p-1.5",
              POPOVER_PANEL,
              menuClassName,
            )}
          >
            {mode === "url" ? (
              <div className="p-1.5">
                <input
                  type="text"
                  value={urlValue}
                  onChange={(e) => {
                    setUrlValue(e.target.value);
                    setUrlError(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveUrl();
                    if (e.key === "Escape") closeUrlInput();
                  }}
                  placeholder="https://example.com/photo.jpg"
                  className={cn(
                    "w-full rounded-lg border px-2.5 py-1.5 font-ui text-sm text-foreground outline-none",
                    urlError
                      ? "border-destructive focus:border-destructive"
                      : "border-input focus:border-ring",
                  )}
                />
                {urlError && (
                  <p className="mt-1 font-ui text-xs text-destructive">
                    Please enter a valid image URL
                  </p>
                )}
                <button
                  type="button"
                  onClick={saveUrl}
                  disabled={checking}
                  className="mt-1.5 w-full rounded-lg bg-muted py-1.5 font-ui text-sm text-brand-strong transition-colors hover:bg-input disabled:opacity-60"
                >
                  {checking ? "Checking…" : "Save"}
                </button>
              </div>
            ) : mode === "emoji" ? (
              <div className="grid max-h-48 grid-cols-5 gap-1 overflow-y-auto p-1">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onChange(null, emoji);
                      close();
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-xl transition-colors hover:bg-muted"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => setMode("url")}
                  className={MENU_ITEM}
                >
                  Paste image URL
                </button>
                <button
                  type="button"
                  onClick={() => uploadInputRef.current?.click()}
                  className={MENU_ITEM}
                >
                  Upload from device
                </button>
                {isMobileDevice && (
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className={MENU_ITEM}
                  >
                    Take a photo
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setMode("emoji")}
                  className={MENU_ITEM}
                >
                  Choose an emoji
                </button>
                {hasPhoto && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange(null, null);
                      setOpen(false);
                    }}
                    className="rounded-lg px-3 py-2 text-left font-ui text-sm text-destructive transition-colors hover:bg-destructive/10"
                  >
                    Remove photo
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {fileInput(uploadInputRef)}
      {fileInput(cameraInputRef, "environment")}
    </>
  );
}
