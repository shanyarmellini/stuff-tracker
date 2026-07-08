"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "~/lib/utils";

// Illustrative mock only — swap for real dashboard data once the features below ship.
const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "beauty", label: "Beauty" },
  { id: "home", label: "Home" },
  { id: "tech", label: "Tech" },
] as const;

const ITEMS = [
  {
    id: "nars",
    emoji: "💄",
    name: "NARS Soft Matte Foundation",
    price: "$48.00",
    hostname: "sephora.com",
    category: "beauty",
  },
  {
    id: "cerave",
    emoji: "🧴",
    name: "CeraVe Moisturizing Cream",
    price: "$19.99",
    hostname: "amazon.com",
    category: "beauty",
  },
  {
    id: "airwrap",
    emoji: "💨",
    name: "Dyson Airwrap Complete",
    price: "$599.99",
    hostname: "dyson.com",
    category: "home",
  },
  {
    id: "airpods",
    emoji: "🎧",
    name: "AirPods Pro",
    price: "$249.00",
    hostname: "apple.com",
    category: "tech",
  },
  {
    id: "mascara",
    emoji: "🖤",
    name: "Too Faced Better Than Sex Mascara",
    price: "$26.00",
    hostname: "sephora.com",
    category: "beauty",
  },
  {
    id: "shampoo",
    emoji: "🧼",
    name: "Olaplex No.4 Bond Maintenance Shampoo",
    price: "$30.00",
    hostname: "amazon.com",
    category: "beauty",
  },
  {
    id: "lipbalm",
    emoji: "💋",
    name: "Laneige Lip Sleeping Mask",
    price: "$24.00",
    hostname: "sephora.com",
    category: "beauty",
  },
  {
    id: "perfume",
    emoji: "🌸",
    name: "Glossier You Perfume",
    price: "$68.00",
    hostname: "glossier.com",
    category: "beauty",
  },
  {
    id: "candle",
    emoji: "🕯️",
    name: "Homesick Scented Candle",
    price: "$34.00",
    hostname: "homesick.com",
    category: "home",
  },
  {
    id: "blanket",
    emoji: "🛋️",
    name: "Weighted Blanket",
    price: "$79.99",
    hostname: "amazon.com",
    category: "home",
  },
  {
    id: "lamp",
    emoji: "💡",
    name: "Ceramic Desk Lamp",
    price: "$45.00",
    hostname: "target.com",
    category: "home",
  },
  {
    id: "pillow",
    emoji: "🛏️",
    name: "Casper Foam Pillow",
    price: "$65.00",
    hostname: "casper.com",
    category: "home",
  },
  {
    id: "iphonecase",
    emoji: "📱",
    name: "iPhone MagSafe Case",
    price: "$49.00",
    hostname: "apple.com",
    category: "tech",
  },
  {
    id: "kindle",
    emoji: "📖",
    name: "Kindle Paperwhite",
    price: "$139.99",
    hostname: "amazon.com",
    category: "tech",
  },
  {
    id: "earbuds",
    emoji: "🎵",
    name: "Anker Soundcore Earbuds",
    price: "$59.99",
    hostname: "amazon.com",
    category: "tech",
  },
] as const;

const EDITED_ITEM = ITEMS[2];
const NEW_NAME = "Dyson Airwrap Complete (Copper)";
const NEW_EMOJI = "🌀";
const UPDATED_ITEM = { ...EDITED_ITEM, name: NEW_NAME, emoji: NEW_EMOJI };
const EMOJI_PICKER_OPTIONS = ["💨", "🌀", "🌬️", "✨", "🎐"] as const;

const SCENES = [
  { id: "categories", beats: 3, label: "Browsing categories" },
  { id: "scroll-items", beats: 3, label: "Scrolling through your stuff" },
  { id: "edit-mode", beats: 8, label: "Editing your items" },
] as const;

const SCHEDULE = SCENES.flatMap((scene) =>
  Array.from({ length: scene.beats }, (_, beat) => ({
    scene: scene.id,
    beat,
    label: scene.label,
  })),
);

type Item = {
  id: string;
  emoji: string;
  name: string;
  price: string;
  hostname: string;
  category: string;
};

function TrashGlyph() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="8"
      height="8"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function CursorGlyph() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="10"
      height="10"
      viewBox="0 0 16 16"
      aria-hidden="true"
    >
      <path
        d="M2 1.5 13 8l-4.6 1.1L6.8 14 2 1.5Z"
        fill="#1e293b"
        stroke="white"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DashboardMock({
  activeCategory,
  editing,
  items,
  scrollFraction,
  cursorItemId,
  cursorPhase,
  doneHighlight,
}: {
  activeCategory: string;
  editing: boolean;
  items: readonly Item[];
  scrollFraction: number;
  cursorItemId: string | null;
  cursorPhase: "hover" | "click" | null;
  doneHighlight: boolean;
}) {
  const totalSpent = items.reduce(
    (sum, item) => sum + Number.parseFloat(item.price.replace("$", "")),
    0,
  );
  const sectionTitle =
    activeCategory === "all"
      ? "All Items"
      : (CATEGORIES.find((cat) => cat.id === activeCategory)?.label ??
        activeCategory);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    el.scrollTo({ top: scrollFraction * max, behavior: "smooth" });
  }, [scrollFraction]);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex justify-end gap-1.5">
        {["Account", "Email", "Settings"].map((label) => (
          <span
            key={label}
            className="rounded-md border border-sky-200 bg-white px-2 py-0.5 font-ui text-[8px] text-slate-500 sm:text-[9px]"
          >
            {label}
          </span>
        ))}
      </div>
      <div className="flex min-h-0 flex-1 gap-3">
        <div className="flex w-20 shrink-0 flex-col gap-0.5 sm:w-28">
          {CATEGORIES.map((cat) => (
            <div key={cat.id} className="flex items-center gap-0.5">
              <span
                className={cn(
                  "min-w-0 flex-1 truncate rounded-lg px-2.5 py-1.5 font-display text-[10px] uppercase tracking-wide transition-colors sm:text-xs",
                  activeCategory === cat.id
                    ? "bg-sky-100 text-sky-700"
                    : "text-slate-400",
                )}
              >
                {cat.label}
              </span>
              {editing && cat.id !== "all" && (
                <span className="flex h-3 w-3 shrink-0 items-center justify-center rounded-full font-ui text-[8px] text-slate-300">
                  ×
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="mb-1.5 font-display text-sm tracking-wide text-slate-800 sm:text-base">
            My Items
          </p>
          <div className="mb-2 flex items-center gap-2">
            <div className="flex flex-1 items-center gap-1.5 rounded-lg border border-sky-100 bg-white px-2.5 py-1.5 shadow-sm">
              <span className="text-[10px] text-slate-300">🔍</span>
              <span className="truncate font-ui text-[10px] text-slate-300">
                Search items…
              </span>
            </div>
          </div>
          <div
            className={cn(
              "mb-2 grid gap-1.5",
              editing ? "grid-cols-4" : "grid-cols-2",
            )}
          >
            <div className="rounded-lg border border-sky-100 bg-white px-2 py-1 shadow-sm">
              <p className="font-ui text-[7px] uppercase tracking-widest text-slate-400 sm:text-[8px]">
                Total Items
              </p>
              <p className="font-display text-xs tracking-wide text-slate-800">
                {items.length}
              </p>
            </div>
            <div className="rounded-lg border border-sky-100 bg-white px-2 py-1 shadow-sm">
              <p className="font-ui text-[7px] uppercase tracking-widest text-slate-400 sm:text-[8px]">
                Money Spent
              </p>
              <p className="font-display text-xs tracking-wide text-slate-800">
                ${totalSpent.toFixed(2)}
              </p>
            </div>
            {editing && (
              <>
                <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2 py-1">
                  <span className="font-display text-[9px] tracking-wide text-slate-500">
                    Cancel
                  </span>
                </div>
                <div className="relative flex items-center justify-center gap-0.5 rounded-lg border border-green-200 bg-green-50 px-2 py-1">
                  <span className="font-ui text-[8px] text-green-600">✓</span>
                  <span className="font-display text-[9px] tracking-wide text-green-600">
                    Done
                  </span>
                  {doneHighlight && (
                    <span className="absolute -bottom-1.5 -right-1.5 flex h-4 w-4 items-center justify-center">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
                      <span className="relative flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white shadow">
                        <CursorGlyph />
                      </span>
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
          <p className="mb-1.5 font-display text-xs tracking-wide text-slate-700">
            {sectionTitle}
          </p>
          <div className="relative min-h-0 flex-1">
            <div
              ref={scrollRef}
              className="grid h-full grid-cols-3 gap-1.5 overflow-y-auto scroll-smooth pb-1"
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg border border-sky-200 bg-sky-50">
                  <span className="font-ui text-sm text-sky-400">+</span>
                  <span className="font-display text-[8px] tracking-wide text-sky-600">
                    Add item
                  </span>
                </div>
                {!editing && (
                  <div className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg border border-sky-200 bg-sky-50">
                    <span className="font-ui text-[10px] text-sky-400">✎</span>
                    <span className="font-display text-[8px] tracking-wide text-sky-600">
                      Edit
                    </span>
                  </div>
                )}
              </div>
              {items.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "relative flex flex-col rounded-lg bg-white p-1.5 shadow-sm transition-all",
                    editing
                      ? "border-2 border-sky-300"
                      : "border border-sky-100",
                    item.id === cursorItemId &&
                      cursorPhase === "click" &&
                      "scale-105 ring-2 ring-sky-300",
                  )}
                >
                  {editing && (
                    <span className="absolute -right-1.5 -top-1.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white shadow">
                      <TrashGlyph />
                    </span>
                  )}
                  {item.id === cursorItemId && (
                    <span className="absolute -bottom-1.5 -right-1.5 z-10 flex h-4 w-4 items-center justify-center">
                      {cursorPhase === "click" && (
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
                      )}
                      <span className="relative flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white shadow">
                        <CursorGlyph />
                      </span>
                    </span>
                  )}
                  <p className="line-clamp-1 font-display text-[10px] leading-tight tracking-wide text-slate-800">
                    {item.name}
                  </p>
                  <div className="my-1 flex flex-1 items-center justify-center rounded-md bg-sky-50 text-lg">
                    {item.emoji}
                  </div>
                  <p className="truncate font-ui text-[9px] font-semibold text-slate-700">
                    {item.price}
                  </p>
                  <p className="flex items-center gap-0.5 truncate font-ui text-[8px] text-sky-400">
                    <span className="truncate">{item.hostname}</span>
                    <span aria-hidden="true">↗</span>
                  </p>
                </div>
              ))}
            </div>
            <div
              className={cn(
                "pointer-events-none absolute inset-x-0 bottom-0 flex h-6 items-end justify-center bg-gradient-to-t from-white to-transparent font-ui text-[9px] text-sky-400 transition-opacity duration-500",
                scrollFraction > 0 ? "opacity-0" : "opacity-100",
              )}
            >
              Scroll for more ↓
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const PHOTO_MENU_OPTIONS = [
  { id: "url", label: "Paste image URL", mobileOnly: false },
  { id: "upload", label: "Upload from device", mobileOnly: false },
  { id: "camera", label: "Take a photo", mobileOnly: true },
  { id: "emoji", label: "Choose an emoji", mobileOnly: false },
  { id: "remove", label: "Remove photo", mobileOnly: false },
] as const;

// modalBeat: 0 = just opened, 1 = typing new name, 2 = photo menu open,
// 3 = emoji picker open, 4 = updated
function EditItemModal({
  modalBeat,
  isMobileDevice,
}: {
  modalBeat: number;
  isMobileDevice: boolean;
}) {
  const typingName = modalBeat === 1;
  const nameUpdated = modalBeat >= 1;
  const menuOpen = modalBeat === 2;
  const pickerOpen = modalBeat === 3;
  const photoUpdated = modalBeat === 4;
  return (
    <div className="flex h-full items-center justify-center">
      <div className="relative w-full max-w-[240px] rounded-2xl border border-sky-100 bg-white p-5 shadow-xl">
        {typingName ? (
          <div className="mb-3 flex items-center gap-1 rounded-lg border border-sky-300 bg-sky-50 px-2 py-1">
            <span className="truncate font-display text-sm tracking-wide text-slate-800">
              {NEW_NAME}
            </span>
            <span className="h-3.5 w-px shrink-0 animate-pulse bg-sky-400" />
          </div>
        ) : (
          <p className="mb-3 truncate font-display text-lg tracking-wide text-slate-800">
            {nameUpdated ? NEW_NAME : EDITED_ITEM.name}
          </p>
        )}
        <div className="relative mb-3 flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-sky-50 text-5xl">
          {photoUpdated ? NEW_EMOJI : EDITED_ITEM.emoji}
          <span className="absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs shadow-md">
            ✏️
          </span>
          {photoUpdated && (
            <span className="absolute -top-2 right-0 rounded-full bg-emerald-50 px-2 py-0.5 font-ui text-[10px] font-medium text-emerald-600">
              Updated
            </span>
          )}
          {menuOpen && (
            <div className="absolute bottom-9 right-1.5 w-36 rounded-xl border border-sky-200 bg-white p-1 text-left shadow-lg">
              {PHOTO_MENU_OPTIONS.filter(
                (option) => !option.mobileOnly || isMobileDevice,
              ).map((option) => (
                <p
                  key={option.id}
                  className={cn(
                    "truncate rounded-lg px-2 py-1.5 font-ui text-[11px]",
                    option.id === "emoji"
                      ? "bg-sky-50 text-sky-600"
                      : option.id === "remove"
                        ? "text-red-500"
                        : "text-slate-600",
                  )}
                >
                  {option.label}
                </p>
              ))}
            </div>
          )}
          {pickerOpen && (
            <div className="absolute bottom-9 right-1.5 flex gap-1 rounded-xl border border-sky-200 bg-white p-1.5 shadow-lg">
              {EMOJI_PICKER_OPTIONS.map((emoji) => (
                <span
                  key={emoji}
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-md text-sm",
                    emoji === NEW_EMOJI && "bg-sky-100 ring-1 ring-sky-400",
                  )}
                >
                  {emoji}
                </span>
              ))}
            </div>
          )}
        </div>
        <p className="font-ui text-sm font-semibold text-slate-700">
          {EDITED_ITEM.price}
        </p>
        <p className="font-ui text-xs text-sky-400">{EDITED_ITEM.hostname}</p>
      </div>
    </div>
  );
}

export function LandingDemo() {
  const [tick, setTick] = useState(0);
  const [visible, setVisible] = useState(true);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 6000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const isMobileUserAgent = /Android|iPhone|iPad|iPod/i.test(
      navigator.userAgent,
    );
    const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
    setIsMobileDevice(isMobileUserAgent && isCoarsePointer);
  }, []);

  const current = SCHEDULE[tick % SCHEDULE.length];

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-triggers the fade on every tick, not just when a value read in the body changes
  useEffect(() => {
    setVisible(false);
    const timeout = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(timeout);
  }, [tick]);

  let activeCategory = "all";
  let editingGrid = false;
  let gridItems: readonly Item[] = ITEMS;
  let scrollFraction = 0;
  let cursorItemId: string | null = null;
  let cursorPhase: "hover" | "click" | null = null;
  let doneHighlight = false;
  let modalBeat: number | null = null;

  if (current.scene === "categories") {
    activeCategory = current.beat === 0 ? "all" : "beauty";
    gridItems =
      activeCategory === "all"
        ? ITEMS
        : ITEMS.filter((item) => item.category === activeCategory);
  } else if (current.scene === "scroll-items") {
    scrollFraction = current.beat / 2;
  } else if (current.scene === "edit-mode") {
    editingGrid = true;
    if (current.beat === 0) {
      cursorItemId = EDITED_ITEM.id;
      cursorPhase = "hover";
    } else if (current.beat === 1) {
      cursorItemId = EDITED_ITEM.id;
      cursorPhase = "click";
    } else if (current.beat >= 2 && current.beat <= 6) {
      modalBeat = current.beat - 2;
    } else if (current.beat === 7) {
      doneHighlight = true;
      gridItems = ITEMS.map((item) =>
        item.id === EDITED_ITEM.id ? UPDATED_ITEM : item,
      );
    }
  }

  const isDashboardScene =
    current.scene === "categories" ||
    current.scene === "scroll-items" ||
    (current.scene === "edit-mode" && modalBeat === null);

  return (
    <div className="w-full max-w-2xl">
      <div
        aria-hidden="true"
        className="rounded-3xl border border-sky-100 bg-white p-6 shadow-xl sm:p-8"
      >
        <div className="mb-5 flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded-full bg-rose-300" />
          <span className="h-3.5 w-3.5 rounded-full bg-amber-300" />
          <span className="h-3.5 w-3.5 rounded-full bg-emerald-300" />
          <span className="ml-2 font-ui text-sm text-slate-400">
            Stuff Tracker
          </span>
          <span className="ml-auto truncate font-ui text-xs italic text-slate-400">
            {current.label}
          </span>
        </div>

        <div
          className={cn(
            "h-[300px] transition-opacity duration-300 sm:h-[340px]",
            visible ? "opacity-100" : "opacity-0",
          )}
        >
          {isDashboardScene && (
            <DashboardMock
              activeCategory={activeCategory}
              editing={editingGrid}
              items={gridItems}
              scrollFraction={scrollFraction}
              cursorItemId={cursorItemId}
              cursorPhase={cursorPhase}
              doneHighlight={doneHighlight}
            />
          )}
          {current.scene === "edit-mode" && modalBeat !== null && (
            <EditItemModal
              modalBeat={modalBeat}
              isMobileDevice={isMobileDevice}
            />
          )}
        </div>
      </div>
      <p className="mt-3 text-center font-ui text-xs italic text-slate-400">
        Preview of how the dashboard will work — still in development.
      </p>
    </div>
  );
}
