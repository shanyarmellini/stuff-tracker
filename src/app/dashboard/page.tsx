"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "~/lib/supabase/client";
import { cn } from "~/lib/utils";

type Item = {
  id: string;
  name: string;
  price: number;
  link: string | null;
  photo_url: string | null;
  emoji: string | null;
  category: string | null;
  sort_order: number;
  created_at: string;
};

type PlaceholderItem = (typeof PLACEHOLDER_ITEMS)[0];

type ViewItem = {
  id: string | null;
  name: string;
  price: number;
  link: string | null;
  photoUrl: string | null;
  emoji: string | null;
  gradient: string | null;
  category: string | null;
};

type HistoryRecord =
  | {
      type: "field-edit";
      target: "item" | "placeholder";
      id: string;
      field: "name" | "price" | "link" | "category";
      oldValue: string | number | null;
      newValue: string | number | null;
    }
  | {
      type: "photo-edit";
      target: "item";
      id: string;
      oldPhotoUrl: string | null;
      oldEmoji: string | null;
      newPhotoUrl: string | null;
      newEmoji: string | null;
    }
  | {
      type: "reorder";
      target: "item";
      order: string[];
      prevOrder: string[];
    }
  | { type: "delete"; target: "item"; id: string; item: Item; index: number }
  | {
      type: "delete";
      target: "placeholder";
      id: string;
      item: PlaceholderItem;
      index: number;
    }
  | { type: "add-category"; id: string; label: string; index: number }
  | { type: "delete-category"; id: string; label: string; index: number }
  | {
      type: "rename-category";
      id: string;
      oldLabel: string;
      newLabel: string;
    };

function SettingsIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("shrink-0 text-slate-400 transition-transform", className)}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
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

function UndoIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m15 14 5-5-5-5" />
      <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
    </svg>
  );
}

const PLACEHOLDER_ITEMS = [
  {
    id: "p1",
    name: "CeraVe Moisturizing Cream",
    price: 19.99,
    link: "amazon.com",
    gradient: "from-sky-100 to-cyan-50",
    emoji: "🧴",
  },
  {
    id: "p2",
    name: "NARS Soft Matte Foundation",
    price: 48.0,
    link: "sephora.com",
    gradient: "from-rose-100 to-pink-50",
    emoji: "💄",
  },
  {
    id: "p3",
    name: "Olaplex No.3 Treatment",
    price: 30.0,
    link: "ulta.com",
    gradient: "from-violet-100 to-purple-50",
    emoji: "✨",
  },
  {
    id: "p4",
    name: "Maison Margiela Replica",
    price: 165.0,
    link: "nordstrom.com",
    gradient: "from-amber-100 to-yellow-50",
    emoji: "🌸",
  },
  {
    id: "p5",
    name: "Beautyblender Original",
    price: 22.0,
    link: "target.com",
    gradient: "from-pink-100 to-fuchsia-50",
    emoji: "🔮",
  },
  {
    id: "p6",
    name: "The Ordinary Niacinamide",
    price: 11.9,
    link: "theordinary.com",
    gradient: "from-teal-100 to-emerald-50",
    emoji: "🧪",
  },
  {
    id: "p7",
    name: "Charlotte Tilbury Pillow Talk",
    price: 32.0,
    link: "charlottetilbury.com",
    gradient: "from-red-100 to-rose-50",
    emoji: "💋",
  },
  {
    id: "p8",
    name: "Dyson Airwrap Complete",
    price: 599.99,
    link: "dyson.com",
    gradient: "from-indigo-100 to-blue-50",
    emoji: "💨",
  },
];

const EMOJI_OPTIONS = [
  "📦",
  "✨",
  "🎁",
  "💎",
  "🔮",
  "🧪",
  "⚗️",
  "🧵",
  "🧶",
  "🪄",
  "🧴",
  "🧼",
  "🧽",
  "🪥",
  "🪒",
  "💄",
  "💋",
  "💅",
  "🪞",
  "💨",
  "🌸",
  "🌹",
  "🌺",
  "🌻",
  "🌷",
  "💐",
  "🍃",
  "🌿",
  "🌱",
  "🪴",
  "👗",
  "👚",
  "👕",
  "👖",
  "🧥",
  "🧦",
  "🧣",
  "🧤",
  "👘",
  "👙",
  "👠",
  "👡",
  "👢",
  "👟",
  "🥿",
  "👜",
  "👛",
  "🎒",
  "🕶️",
  "🧢",
  "👒",
  "🎩",
  "💍",
  "📿",
  "⌚",
  "💇‍♀️",
  "✂️",
  "🪮",
  "🎀",
  "🎧",
  "📱",
  "💻",
  "🖥️",
  "⌨️",
  "🖱️",
  "📷",
  "📸",
  "🔌",
  "🔋",
  "🎮",
  "🕹️",
  "📚",
  "📖",
  "✏️",
  "🖊️",
  "📓",
  "🗂️",
  "🛋️",
  "🛏️",
  "🪑",
  "🚪",
  "🖼️",
  "🕯️",
  "🧯",
  "🧸",
  "🎨",
  "🖌️",
  "☕",
  "🍵",
  "🍷",
  "🍫",
  "🍪",
  "⚽",
  "🏀",
  "🎾",
  "🚴‍♂️",
  "⛺",
  "🎣",
  "🐶",
  "🐕",
  "🐾",
  "🐱",
  "🐰",
  "🐹",
  "🐦",
  "🐠",
];

function normalizeUrl(value: string): string {
  return value.startsWith("http") ? value : `https://${value}`;
}

function formatMoney(value: number): string {
  if (value >= 1_000_000_000)
    return `$${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
  if (value >= 1_000_000)
    return `$${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 1_000)
    return `$${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return `$${value.toFixed(2)}`;
}

function isValidLink(value: string): boolean {
  if (!value) return true;
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    return /^([^.]+\.)+[^.]{2,}$/.test(url.hostname);
  } catch {
    return false;
  }
}

function loadsAsImage(url: string, timeoutMs = 8000): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new window.Image();
    let settled = false;
    const finish = (result: boolean) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    img.onload = () => finish(true);
    img.onerror = () => finish(false);
    setTimeout(() => finish(false), timeoutMs);
    img.src = url;
  });
}

function linkHostname(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(
      url.startsWith("http") ? url : `https://${url}`,
    ).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

export default function DashboardPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editSnapshot, setEditSnapshot] = useState<{
    items: Item[];
    placeholders: typeof PLACEHOLDER_ITEMS;
    categories: { id: string; label: string }[];
  } | null>(null);
  const [newCatInput, setNewCatInput] = useState("");
  const [linkErrorId, setLinkErrorId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailPasteText, setEmailPasteText] = useState("");
  const [emailPasteLoading, setEmailPasteLoading] = useState(false);
  const [emailPasteError, setEmailPasteError] = useState<string | null>(null);
  const [emailPasteResult, setEmailPasteResult] = useState<string | null>(null);
  const [emailPasteAddedIds, setEmailPasteAddedIds] = useState<string[]>([]);
  const [emailPasteUndoing, setEmailPasteUndoing] = useState(false);
  const [viewItem, setViewItem] = useState<ViewItem | null>(null);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const [photoUrlInputOpen, setPhotoUrlInputOpen] = useState(false);
  const [photoUrlValue, setPhotoUrlValue] = useState("");
  const [photoUrlError, setPhotoUrlError] = useState(false);
  const [photoUrlChecking, setPhotoUrlChecking] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [addForm, setAddForm] = useState<{
    name: string;
    price: string;
    link: string;
    category: string;
    photoUrl: string | null;
    emoji: string | null;
  }>({
    name: "",
    price: "",
    link: "",
    category: "",
    photoUrl: null,
    emoji: null,
  });
  const [addPhotoMenuOpen, setAddPhotoMenuOpen] = useState(false);
  const [addPhotoUrlInputOpen, setAddPhotoUrlInputOpen] = useState(false);
  const [addPhotoUrlValue, setAddPhotoUrlValue] = useState("");
  const [addPhotoUrlError, setAddPhotoUrlError] = useState(false);
  const [addPhotoUrlChecking, setAddPhotoUrlChecking] = useState(false);
  const [addEmojiPickerOpen, setAddEmojiPickerOpen] = useState(false);
  const [addUploadingPhoto, setAddUploadingPhoto] = useState(false);
  const addUploadInputRef = useRef<HTMLInputElement>(null);
  const addCameraInputRef = useRef<HTMLInputElement>(null);
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [addCatSearch, setAddCatSearch] = useState("");
  const [addCatCreating, setAddCatCreating] = useState(false);
  const [addCatNewLabel, setAddCatNewLabel] = useState("");
  const [addCatPendingLabel, setAddCatPendingLabel] = useState<string | null>(
    null,
  );
  const [addLinkError, setAddLinkError] = useState(false);
  const [pendingDeletes, setPendingDeletes] = useState<string[]>([]);
  const [editKey, setEditKey] = useState(0);
  const [editHistory, setEditHistory] = useState<{
    stack: HistoryRecord[];
    index: number;
  }>({ stack: [], index: -1 });
  const editHistoryRef = useRef(editHistory);
  editHistoryRef.current = editHistory;
  const addCatInputRef = useRef<HTMLInputElement>(null);
  const addCatNewLabelInputRef = useRef<HTMLInputElement>(null);
  const [itemsLoaded, setItemsLoaded] = useState(false);
  const [displayedPlaceholders, setDisplayedPlaceholders] =
    useState(PLACEHOLDER_ITEMS);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const dragStartOrderRef = useRef<string[] | null>(null);
  const [categories, setCategories] = useState<{ id: string; label: string }[]>(
    [{ id: "all", label: "All" }],
  );
  const [renameCatLength, setRenameCatLength] = useState(0);

  useEffect(() => {
    if (addCatCreating) addCatNewLabelInputRef.current?.focus();
  }, [addCatCreating]);

  useEffect(() => {
    const isMobileUserAgent = /Android|iPhone|iPad|iPod/i.test(
      navigator.userAgent,
    );
    const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
    setIsMobileDevice(isMobileUserAgent && isCoarsePointer);
  }, []);

  const applyItemsAndCategories = useCallback(
    (profileTypes: string[], items: Item[]) => {
      // Collect any categories on items that aren't already in the profile
      const profileIds = new Set(profileTypes.map((t) => t.toLowerCase()));
      const itemCategoryLabels: string[] = [];
      for (const item of items) {
        if (item.category && !profileIds.has(item.category.toLowerCase())) {
          itemCategoryLabels.push(item.category);
          profileIds.add(item.category.toLowerCase());
        }
      }

      const allTypes = [...profileTypes, ...itemCategoryLabels];
      if (allTypes.length > 0) {
        setCategories([
          { id: "all", label: "All" },
          ...allTypes.map((t) => ({ id: t.toLowerCase(), label: t })),
        ]);
      }

      setItems(items);
    },
    [],
  );

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) return;
      setEmail(user.email ?? null);
      setUserId(user.id);

      Promise.all([
        supabase
          .from("profiles")
          .select("item_types")
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("items")
          .select("*")
          .order("sort_order", { ascending: true }),
      ]).then(([{ data: profile }, { data: itemsData }]) => {
        applyItemsAndCategories(
          profile?.item_types ?? [],
          (itemsData ?? []) as Item[],
        );
        setItemsLoaded(true);
      });
    });
  }, [applyItemsAndCategories]);

  const refreshItemsAndCategories = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: profile }, { data: itemsData }] = await Promise.all([
      supabase
        .from("profiles")
        .select("item_types")
        .eq("user_id", user.id)
        .single(),
      supabase.from("items").select("*").order("sort_order", {
        ascending: true,
      }),
    ]);
    applyItemsAndCategories(
      profile?.item_types ?? [],
      (itemsData ?? []) as Item[],
    );
  }, [applyItemsAndCategories]);

  const viewItemId = viewItem?.id ?? null;

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesCategory =
      activeCategory === "all" ||
      (item.category ?? "").toLowerCase() === activeCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const displayItems = items;
  const totalSpent = displayItems.reduce((sum, item) => sum + item.price, 0);

  const sectionTitle =
    activeCategory === "all"
      ? "All Items"
      : (categories.find((c) => c.id === activeCategory)?.label ??
        activeCategory);

  const pushHistory = (record: HistoryRecord) => {
    const cur = editHistoryRef.current;
    setEditHistory({
      stack: [...cur.stack.slice(0, cur.index + 1), record],
      index: cur.index + 1,
    });
  };

  const applyRecord = (record: HistoryRecord, isUndo: boolean) => {
    if (record.type === "field-edit") {
      const value = isUndo ? record.oldValue : record.newValue;
      if (record.target === "item") {
        setItems((prev) =>
          prev.map((item) =>
            item.id === record.id ? { ...item, [record.field]: value } : item,
          ),
        );
      } else {
        setDisplayedPlaceholders((prev) =>
          prev.map((item) =>
            item.id === record.id ? { ...item, [record.field]: value } : item,
          ),
        );
      }
    } else if (record.type === "photo-edit") {
      const photoUrl = isUndo ? record.oldPhotoUrl : record.newPhotoUrl;
      const emoji = isUndo ? record.oldEmoji : record.newEmoji;
      setItems((prev) =>
        prev.map((item) =>
          item.id === record.id
            ? { ...item, photo_url: photoUrl, emoji }
            : item,
        ),
      );
    } else if (record.type === "add-category") {
      if (isUndo) {
        setCategories((prev) => prev.filter((c) => c.id !== record.id));
        if (activeCategory === record.id) setActiveCategory("all");
      } else {
        setCategories((prev) => {
          const next = [...prev];
          next.splice(record.index, 0, { id: record.id, label: record.label });
          return next;
        });
      }
    } else if (record.type === "delete-category") {
      if (isUndo) {
        setCategories((prev) => {
          const next = [...prev];
          next.splice(record.index, 0, { id: record.id, label: record.label });
          return next;
        });
      } else {
        setCategories((prev) => prev.filter((c) => c.id !== record.id));
        if (activeCategory === record.id) setActiveCategory("all");
      }
    } else if (record.type === "rename-category") {
      const label = isUndo ? record.oldLabel : record.newLabel;
      setCategories((prev) =>
        prev.map((c) => (c.id === record.id ? { ...c, label } : c)),
      );
    } else if (record.type === "reorder") {
      const order = isUndo ? record.prevOrder : record.order;
      setItems((prev) => {
        const byId = new Map(prev.map((item) => [item.id, item]));
        return order
          .map((id) => byId.get(id))
          .filter((item): item is Item => item !== undefined);
      });
    } else {
      if (isUndo) {
        if (record.target === "item") {
          setItems((prev) => {
            const next = [...prev];
            next.splice(record.index, 0, record.item);
            return next;
          });
          setPendingDeletes((prev) => prev.filter((id) => id !== record.id));
        } else {
          setDisplayedPlaceholders((prev) => {
            const next = [...prev];
            next.splice(record.index, 0, record.item);
            return next;
          });
        }
      } else {
        if (record.target === "item") {
          setItems((prev) => prev.filter((item) => item.id !== record.id));
          setPendingDeletes((prev) => [...prev, record.id]);
        } else {
          setDisplayedPlaceholders((prev) =>
            prev.filter((item) => item.id !== record.id),
          );
        }
      }
    }
    setEditKey((k) => k + 1);
  };

  const handleUndo = () => {
    const cur = editHistoryRef.current;
    if (cur.index < 0) return;
    applyRecord(cur.stack[cur.index], true);
    setEditHistory((prev) => ({ ...prev, index: prev.index - 1 }));
  };

  const handleRedo = () => {
    const cur = editHistoryRef.current;
    if (cur.index >= cur.stack.length - 1) return;
    applyRecord(cur.stack[cur.index + 1], false);
    setEditHistory((prev) => ({ ...prev, index: prev.index + 1 }));
  };

  const handleItemChange = (
    id: string,
    field: "name" | "price" | "link" | "category",
    value: string | number,
  ) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const handleItemPhotoChange = (
    id: string,
    photoUrl: string | null,
    emoji: string | null,
  ) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, photo_url: photoUrl, emoji } : item,
      ),
    );
  };

  const handleDeleteItem = (id: string) => {
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) return;
    pushHistory({
      type: "delete",
      target: "item",
      id,
      item: items[index],
      index,
    });
    const next = items.filter((item) => item.id !== id);
    setItems(next);
    setPendingDeletes((prev) => [...prev, id]);
    if (next.length === 0) setIsEditing(false);
  };

  const handleItemDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    id: string,
  ) => {
    dragStartOrderRef.current = items.map((item) => item.id);
    setDraggedItemId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleItemDragOver = (
    e: React.DragEvent<HTMLDivElement>,
    targetId: string,
  ) => {
    e.preventDefault();
    if (!draggedItemId || draggedItemId === targetId) return;
    setItems((prev) => {
      const dragIndex = prev.findIndex((item) => item.id === draggedItemId);
      const targetIndex = prev.findIndex((item) => item.id === targetId);
      if (dragIndex === -1 || targetIndex === -1 || dragIndex === targetIndex) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const handleItemDragEnd = () => {
    const startOrder = dragStartOrderRef.current;
    dragStartOrderRef.current = null;
    setDraggedItemId(null);
    if (!startOrder) return;
    const endOrder = items.map((item) => item.id);
    if (startOrder.join(",") !== endOrder.join(",")) {
      pushHistory({
        type: "reorder",
        target: "item",
        prevOrder: startOrder,
        order: endOrder,
      });
    }
  };

  const handleDone = async () => {
    setIsEditing(false);
    const snap = editSnapshot;
    setEditSnapshot(null);
    const toDelete = pendingDeletes;
    setPendingDeletes([]);
    setEditHistory({ stack: [], index: -1 });
    setNewCatInput("");
    const supabase = createClient();
    const saves: PromiseLike<{ error: { message: string } | null }>[] = [];
    if (snap && items.length > 0) {
      const orderChanged =
        items.map((item) => item.id).join(",") !==
        snap.items.map((item) => item.id).join(",");
      const orderedItems = orderChanged
        ? items.map((item, index) => ({ ...item, sort_order: index }))
        : items;
      if (orderChanged) setItems(orderedItems);
      const changed = orderedItems.filter((item) => {
        const orig = snap.items.find((i) => i.id === item.id);
        return (
          orig &&
          (orig.name !== item.name ||
            orig.price !== item.price ||
            orig.link !== item.link ||
            orig.photo_url !== item.photo_url ||
            orig.emoji !== item.emoji ||
            orig.category !== item.category ||
            orig.sort_order !== item.sort_order)
        );
      });
      saves.push(
        ...changed.map((item) =>
          supabase
            .from("items")
            .update({
              name: item.name,
              price: item.price,
              link: item.link,
              photo_url: item.photo_url,
              emoji: item.emoji,
              category: item.category,
              sort_order: item.sort_order,
            })
            .eq("id", item.id),
        ),
      );
    }
    if (toDelete.length > 0) {
      saves.push(supabase.from("items").delete().in("id", toDelete));
    }
    if (userId && snap) {
      const newTypes = categories
        .filter((c) => c.id !== "all")
        .map((c) => c.label);
      const oldTypes = snap.categories
        .filter((c) => c.id !== "all")
        .map((c) => c.label);
      if (JSON.stringify(newTypes) !== JSON.stringify(oldTypes)) {
        saves.push(
          supabase
            .from("profiles")
            .update({ item_types: newTypes })
            .eq("user_id", userId),
        );
      }
    }
    const results = await Promise.all(saves);
    for (const result of results) {
      if (result.error) {
        console.error("Failed to save item changes:", result.error.message);
      }
    }
  };

  const handleCancel = () => {
    if (editSnapshot) {
      setItems(editSnapshot.items);
      setDisplayedPlaceholders(editSnapshot.placeholders);
      setCategories(editSnapshot.categories);
    }
    setIsEditing(false);
    setEditSnapshot(null);
    setPendingDeletes([]);
    setEditHistory({ stack: [], index: -1 });
    setEditKey((k) => k + 1);
    setNewCatInput("");
  };

  const handlePriceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const nav = [
      "Backspace",
      "Delete",
      "ArrowLeft",
      "ArrowRight",
      "Tab",
      "Enter",
    ];
    if (nav.includes(e.key)) return;
    if (e.key === ".") {
      if (e.currentTarget.value.includes(".")) e.preventDefault();
      return;
    }
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
      return;
    }
    const digits = e.currentTarget.value.replace(".", "").length;
    if (digits >= 10) e.preventDefault();
  };

  const handleAddItem = async () => {
    if (!addForm.name.trim() || !userId) return;
    if (addForm.link.trim() && !isValidLink(addForm.link.trim())) {
      setAddLinkError(true);
      return;
    }
    const supabase = createClient();
    const minSortOrder =
      items.length > 0 ? Math.min(...items.map((item) => item.sort_order)) : 1;
    const { data, error } = await supabase
      .from("items")
      .insert({
        user_id: userId,
        name: addForm.name.trim(),
        price: parseFloat(addForm.price) || 0,
        link: addForm.link.trim() || null,
        category: addForm.category || null,
        sort_order: minSortOrder - 1,
        photo_url: addForm.photoUrl,
        emoji: addForm.emoji,
      })
      .select()
      .single();
    if (error) {
      console.error("Failed to add item:", error.message);
      return;
    }
    if (data) {
      if (
        addCatPendingLabel &&
        !categories.some((c) => c.id === addForm.category)
      ) {
        const newCategories = [
          ...categories,
          { id: addForm.category, label: addCatPendingLabel },
        ];
        setCategories(newCategories);
        const newTypes = newCategories
          .filter((c) => c.id !== "all")
          .map((c) => c.label);
        supabase
          .from("profiles")
          .update({ item_types: newTypes })
          .eq("user_id", userId)
          .then(({ error: profileError }) => {
            if (profileError) {
              console.error("Failed to save category:", profileError.message);
            }
          });
      }
      setItems((prev) => [data as Item, ...prev]);
    }
    closeAddModal();
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setAddForm({
      name: "",
      price: "",
      link: "",
      category: "",
      photoUrl: null,
      emoji: null,
    });
    setAddCatSearch("");
    setAddCatOpen(false);
    setAddCatCreating(false);
    setAddCatNewLabel("");
    setAddLinkError(false);
    setAddCatPendingLabel(null);
    setAddPhotoMenuOpen(false);
    setAddPhotoUrlInputOpen(false);
    setAddPhotoUrlValue("");
    setAddPhotoUrlError(false);
    setAddPhotoUrlChecking(false);
    setAddEmojiPickerOpen(false);
  };

  const closeEmailModal = () => {
    setShowEmailModal(false);
    setEmailPasteText("");
    setEmailPasteLoading(false);
    setEmailPasteError(null);
    setEmailPasteResult(null);
    setEmailPasteAddedIds([]);
  };

  const handleEmailPasteSubmit = async () => {
    const text = emailPasteText.trim();
    if (!text) return;
    setEmailPasteLoading(true);
    setEmailPasteError(null);
    setEmailPasteResult(null);
    setEmailPasteAddedIds([]);
    try {
      const res = await fetch("/api/manual-emails/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data: { added?: number; itemIds?: string[]; error?: string } =
        await res.json();
      if (!res.ok) {
        setEmailPasteError(data.error ?? "Something went wrong.");
        return;
      }
      const added = data.added ?? 0;
      if (added === 0) {
        setEmailPasteResult(
          "No purchase was found in that email. Paste the order confirmation you got right after checkout (it should show a price) — not a shipping or delivery update, which won't have one.",
        );
      } else {
        setEmailPasteResult(
          `Added ${added} item${added === 1 ? "" : "s"} to your collection.`,
        );
        setEmailPasteAddedIds(data.itemIds ?? []);
        setEmailPasteText("");
        await refreshItemsAndCategories();
      }
    } catch {
      setEmailPasteError("Something went wrong. Please try again.");
    } finally {
      setEmailPasteLoading(false);
    }
  };

  const handleUndoEmailPaste = async () => {
    if (emailPasteAddedIds.length === 0) return;
    setEmailPasteUndoing(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("items")
      .delete()
      .in("id", emailPasteAddedIds);
    setEmailPasteUndoing(false);
    if (error) {
      console.error("Failed to undo added items:", error.message);
      setEmailPasteError("Couldn't undo — please try again.");
      return;
    }
    setEmailPasteAddedIds([]);
    setEmailPasteResult("Removed those items from your collection.");
    await refreshItemsAndCategories();
  };

  const handleAddPhotoFile = async (file: File | undefined) => {
    if (!file || !userId) return;
    setAddPhotoMenuOpen(false);
    setAddUploadingPhoto(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("item-photos")
      .upload(path, file);
    if (uploadError) {
      console.error("Failed to upload photo:", uploadError.message);
      setAddUploadingPhoto(false);
      return;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from("item-photos").getPublicUrl(path);
    setAddForm((f) => ({ ...f, photoUrl: publicUrl, emoji: null }));
    setAddUploadingPhoto(false);
  };

  const handleAddPhotoUrlSave = async () => {
    if (addPhotoUrlChecking) return;
    const v = addPhotoUrlValue.trim();
    if (!v) return;
    if (!isValidLink(v)) {
      setAddPhotoUrlError(true);
      return;
    }
    const normalized = normalizeUrl(v);
    setAddPhotoUrlChecking(true);
    const ok = await loadsAsImage(normalized);
    setAddPhotoUrlChecking(false);
    if (!ok) {
      setAddPhotoUrlError(true);
      return;
    }
    setAddForm((f) => ({ ...f, photoUrl: normalized, emoji: null }));
    setAddPhotoUrlInputOpen(false);
    setAddPhotoUrlValue("");
    setAddPhotoUrlError(false);
    setAddPhotoMenuOpen(false);
  };

  const handleAddChooseEmoji = (emoji: string) => {
    setAddForm((f) => ({ ...f, photoUrl: null, emoji }));
    setAddEmojiPickerOpen(false);
    setAddPhotoMenuOpen(false);
  };

  const handleAddRemovePhoto = () => {
    setAddForm((f) => ({ ...f, photoUrl: null, emoji: null }));
    setAddPhotoMenuOpen(false);
  };

  const openViewItem = (vi: ViewItem) => {
    setPhotoMenuOpen(false);
    setPhotoUrlInputOpen(false);
    setPhotoUrlValue("");
    setPhotoUrlError(false);
    setPhotoUrlChecking(false);
    setEmojiPickerOpen(false);
    setCategoryMenuOpen(false);
    setViewItem(vi);
  };

  const closeViewItem = () => {
    setPhotoMenuOpen(false);
    setPhotoUrlInputOpen(false);
    setPhotoUrlValue("");
    setPhotoUrlError(false);
    setPhotoUrlChecking(false);
    setEmojiPickerOpen(false);
    setCategoryMenuOpen(false);
    setViewItem(null);
  };

  const handleViewCategoryChange = (categoryId: string) => {
    setCategoryMenuOpen(false);
    if (!viewItemId || !viewItem || categoryId === viewItem.category) return;
    pushHistory({
      type: "field-edit",
      target: "item",
      id: viewItemId,
      field: "category",
      oldValue: viewItem.category,
      newValue: categoryId,
    });
    handleItemChange(viewItemId, "category", categoryId);
    setViewItem((prev) => (prev ? { ...prev, category: categoryId } : prev));
  };

  const applyPhotoEdit = (photoUrl: string | null, emoji: string | null) => {
    if (!viewItemId || !viewItem) return;
    pushHistory({
      type: "photo-edit",
      target: "item",
      id: viewItemId,
      oldPhotoUrl: viewItem.photoUrl,
      oldEmoji: viewItem.emoji,
      newPhotoUrl: photoUrl,
      newEmoji: emoji,
    });
    handleItemPhotoChange(viewItemId, photoUrl, emoji);
    setViewItem((prev) => (prev ? { ...prev, photoUrl, emoji } : prev));
  };

  const handlePhotoFile = async (file: File | undefined) => {
    if (!file || !viewItemId || !userId) return;
    setPhotoMenuOpen(false);
    setUploadingPhoto(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("item-photos")
      .upload(path, file);
    if (uploadError) {
      console.error("Failed to upload photo:", uploadError.message);
      setUploadingPhoto(false);
      return;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from("item-photos").getPublicUrl(path);
    applyPhotoEdit(publicUrl, null);
    setUploadingPhoto(false);
  };

  const handlePhotoUrlSave = async () => {
    if (photoUrlChecking) return;
    const v = photoUrlValue.trim();
    if (!v) return;
    if (!isValidLink(v)) {
      setPhotoUrlError(true);
      return;
    }
    const normalized = normalizeUrl(v);
    setPhotoUrlChecking(true);
    const ok = await loadsAsImage(normalized);
    setPhotoUrlChecking(false);
    if (!ok) {
      setPhotoUrlError(true);
      return;
    }
    applyPhotoEdit(normalized, null);
    setPhotoUrlInputOpen(false);
    setPhotoUrlValue("");
    setPhotoUrlError(false);
    setPhotoMenuOpen(false);
  };

  const handleChooseEmoji = (emoji: string) => {
    applyPhotoEdit(null, emoji);
    setEmojiPickerOpen(false);
    setPhotoMenuOpen(false);
  };

  const handleRemovePhoto = () => {
    applyPhotoEdit(null, null);
    setPhotoMenuOpen(false);
  };

  return (
    <>
      <div className="flex h-[calc(100vh-3.5rem)] bg-sky-50">
        {/* ── Sidebar ── */}
        <aside className="flex w-56 shrink-0 flex-col border-r border-sky-100 bg-white">
          <div className="flex flex-col gap-0.5 px-3 py-6">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-1">
                {isEditing && cat.id !== "all" ? (
                  <div className="min-w-0 flex-1 flex flex-col">
                    <input
                      type="text"
                      defaultValue={cat.label}
                      maxLength={30}
                      onFocus={(e) => {
                        setActiveCategory(cat.id);
                        setRenameCatLength(e.target.value.length);
                      }}
                      onChange={(e) =>
                        setRenameCatLength(e.target.value.length)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                      }}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (!v) {
                          e.target.value = cat.label;
                          return;
                        }
                        if (v !== cat.label) {
                          pushHistory({
                            type: "rename-category",
                            id: cat.id,
                            oldLabel: cat.label,
                            newLabel: v,
                          });
                          setCategories((prev) =>
                            prev.map((c) =>
                              c.id === cat.id ? { ...c, label: v } : c,
                            ),
                          );
                        }
                      }}
                      className={cn(
                        "w-full rounded-xl bg-transparent px-4 py-2.5 text-left text-base uppercase outline-none transition-colors font-display tracking-wide truncate",
                        activeCategory === cat.id
                          ? "bg-sky-100 text-sky-700"
                          : "text-slate-500 hover:bg-sky-50 hover:text-sky-600",
                      )}
                    />
                    {activeCategory === cat.id && renameCatLength >= 30 && (
                      <p className="px-4 font-ui text-xs text-red-500">
                        The 30 character limit has been reached.
                      </p>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                      "min-w-0 flex-1 rounded-xl px-4 py-2.5 text-left text-base uppercase transition-colors font-display tracking-wide truncate",
                      activeCategory === cat.id
                        ? "bg-sky-100 text-sky-700"
                        : "text-slate-500 hover:bg-sky-50 hover:text-sky-600",
                    )}
                  >
                    {cat.label}
                  </button>
                )}
                {isEditing && cat.id !== "all" && (
                  <button
                    type="button"
                    onClick={() => {
                      const idx = categories.findIndex((c) => c.id === cat.id);
                      pushHistory({
                        type: "delete-category",
                        id: cat.id,
                        label: cat.label,
                        index: idx,
                      });
                      const next = categories.filter((c) => c.id !== cat.id);
                      setCategories(next);
                      if (activeCategory === cat.id) setActiveCategory("all");
                    }}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-red-50 hover:text-red-400"
                    aria-label={`Delete ${cat.label} category`}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            {isEditing && (
              <div className="mt-1 flex flex-col gap-0.5 px-4">
                {newCatInput.length >= 30 && (
                  <p className="font-ui text-xs text-red-500">
                    The 30 character limit has been reached.
                  </p>
                )}
                <input
                  type="text"
                  value={newCatInput}
                  maxLength={30}
                  onChange={(e) => setNewCatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const label = newCatInput.trim();
                      if (!label) return;
                      const id = label.toLowerCase();
                      if (categories.some((c) => c.id === id)) {
                        setNewCatInput("");
                        return;
                      }
                      pushHistory({
                        type: "add-category",
                        id,
                        label,
                        index: categories.length,
                      });
                      setCategories((prev) => [...prev, { id, label }]);
                      setNewCatInput("");
                    }
                  }}
                  onBlur={() => {
                    const label = newCatInput.trim();
                    if (!label) return;
                    const id = label.toLowerCase();
                    if (!categories.some((c) => c.id === id)) {
                      pushHistory({
                        type: "add-category",
                        id,
                        label,
                        index: categories.length,
                      });
                      setCategories((prev) => [...prev, { id, label }]);
                    }
                    setNewCatInput("");
                  }}
                  placeholder="+ Add category"
                  className="w-full bg-transparent font-display text-base tracking-wide uppercase text-slate-400 outline-none placeholder:text-slate-300"
                />
              </div>
            )}
          </div>
        </aside>

        {/* ── Main area ── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top-right nav */}
          <div className="flex shrink-0 justify-end gap-2 px-8 py-3">
            <button
              type="button"
              className="rounded-lg border border-sky-200 bg-white px-4 py-1.5 text-xs text-slate-500 font-ui transition-colors hover:bg-sky-50 hover:text-sky-600"
            >
              Account
            </button>
            <button
              type="button"
              onClick={() => setShowEmailModal(true)}
              className="rounded-lg border border-sky-200 bg-white px-4 py-1.5 text-xs text-slate-500 font-ui transition-colors hover:bg-sky-50 hover:text-sky-600"
            >
              Add from email
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-sky-200 bg-white px-4 py-1.5 text-xs text-slate-500 font-ui transition-colors hover:bg-sky-50 hover:text-sky-600"
            >
              <SettingsIcon />
              Settings
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-8 pb-10">
            {/* Header */}
            <div className="mb-5">
              <h1 className="font-display text-4xl tracking-wide text-slate-800">
                My Items
              </h1>
              {email && (
                <p className="font-ui text-sm text-slate-400">{email}</p>
              )}
            </div>

            {/* Search bar */}
            <div className="relative mb-6">
              <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                <SearchIcon />
              </div>
              <input
                type="search"
                placeholder="Search items…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-sky-100 bg-white py-3 pl-11 pr-4 text-sm font-ui text-slate-700 shadow-sm outline-none placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100 transition-all"
              />
            </div>

            {/* Stats row */}
            <div
              className={cn(
                "mb-8 grid gap-4",
                isEditing ? "grid-cols-4" : "grid-cols-2",
              )}
            >
              <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
                <p className="font-ui text-xs uppercase tracking-widest text-slate-400">
                  Total Items
                </p>
                <p className="mt-1 font-display text-3xl tracking-wide text-slate-800">
                  {displayItems.length}
                </p>
              </div>
              <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
                <p className="font-ui text-xs uppercase tracking-widest text-slate-400">
                  Money Spent
                </p>
                <p className="mt-1 font-display text-2xl tracking-wide text-slate-800">
                  {formatMoney(totalSpent)}
                </p>
              </div>
              {isEditing && (
                <>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm transition-colors hover:bg-slate-100"
                  >
                    <span className="font-display text-lg tracking-wide text-slate-500">
                      Cancel
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDone}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-green-200 bg-green-50 p-5 shadow-sm transition-colors hover:bg-green-100"
                  >
                    <CheckIcon />
                    <span className="font-display text-lg tracking-wide text-green-600">
                      Done
                    </span>
                  </button>
                </>
              )}
            </div>

            {/* Items grid or empty state */}
            {!itemsLoaded ? null : items.length === 0 ? (
              <>
                <div className="mb-4">
                  <h2 className="font-display text-2xl tracking-wide text-slate-700">
                    {sectionTitle}
                  </h2>
                </div>
                <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-sky-200 bg-white py-16">
                  <p className="font-ui text-sm text-slate-400">
                    No items yet. Add something to get started.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-5 py-2.5 font-display tracking-wide text-sky-600 transition-colors hover:bg-sky-100"
                  >
                    <PlusIcon />
                    Add your first item
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-baseline gap-2">
                    <h2 className="font-display text-2xl tracking-wide text-slate-700">
                      {sectionTitle}
                    </h2>
                  </div>
                  {isEditing && (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={handleUndo}
                        disabled={editHistory.index < 0}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-sky-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label="Undo"
                      >
                        <UndoIcon />
                      </button>
                      <button
                        type="button"
                        onClick={handleRedo}
                        disabled={
                          editHistory.index >= editHistory.stack.length - 1
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-sky-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label="Redo"
                      >
                        <RedoIcon />
                      </button>
                    </div>
                  )}
                </div>
                {filteredItems.length === 0 ? (
                  <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-sky-200 bg-white">
                    <p className="font-ui text-sm text-slate-400">
                      No items found.
                    </p>
                  </div>
                ) : (
                  <div
                    key={editKey}
                    className="grid grid-cols-2 gap-4 [grid-auto-rows:240px] sm:grid-cols-3 lg:grid-cols-4"
                  >
                    <div className="flex h-full flex-col gap-4">
                      <button
                        type="button"
                        onClick={() => setShowAddModal(true)}
                        className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 shadow-sm transition-colors hover:bg-sky-100"
                      >
                        <PlusIcon />
                        <span className="font-display text-lg tracking-wide text-sky-600">
                          Add item
                        </span>
                      </button>
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditSnapshot({
                              items: [...items],
                              placeholders: [...displayedPlaceholders],
                              categories: [...categories],
                            });
                            setEditHistory({ stack: [], index: -1 });
                            setIsEditing(true);
                          }}
                          className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 shadow-sm transition-colors hover:bg-sky-100"
                        >
                          <PencilIcon />
                          <span className="font-display text-lg tracking-wide text-sky-600">
                            Edit
                          </span>
                        </button>
                      )}
                    </div>
                    {filteredItems.map((item) => {
                      const hostname = linkHostname(item.link);
                      return (
                        // biome-ignore lint/a11y/useSemanticElements: contains nested buttons/links, which <button> cannot
                        <div
                          key={item.id}
                          role="button"
                          tabIndex={0}
                          aria-label={
                            isEditing
                              ? `Edit ${item.name}`
                              : `View ${item.name}`
                          }
                          draggable={isEditing}
                          onDragStart={(e) => handleItemDragStart(e, item.id)}
                          onDragOver={(e) => handleItemDragOver(e, item.id)}
                          onDrop={(e) => e.preventDefault()}
                          onDragEnd={handleItemDragEnd}
                          onClick={() =>
                            openViewItem({
                              id: item.id,
                              name: item.name,
                              price: item.price,
                              link: item.link,
                              photoUrl: item.photo_url,
                              emoji: item.emoji,
                              gradient: null,
                              category: item.category,
                            })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openViewItem({
                                id: item.id,
                                name: item.name,
                                price: item.price,
                                link: item.link,
                                photoUrl: item.photo_url,
                                emoji: item.emoji,
                                gradient: null,
                                category: item.category,
                              });
                            }
                          }}
                          className={cn(
                            "relative flex h-full flex-col rounded-2xl bg-white p-3 shadow-sm transition-all hover:shadow-md",
                            isEditing
                              ? "cursor-grab border-2 border-sky-300 active:cursor-grabbing"
                              : "cursor-pointer border border-sky-100",
                            draggedItemId === item.id && "opacity-40",
                          )}
                        >
                          {isEditing && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteItem(item.id);
                              }}
                              className="absolute -right-2 -top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow transition-colors hover:bg-red-600"
                              aria-label={`Delete ${item.name}`}
                            >
                              <TrashIcon />
                            </button>
                          )}

                          <p className="line-clamp-2 font-display text-2xl leading-tight tracking-wide text-slate-800">
                            {item.name}
                          </p>

                          <div className="relative my-2 flex-1 overflow-hidden rounded-xl bg-sky-50">
                            {item.photo_url ? (
                              // biome-ignore lint/performance/noImgElement: photo_url can be an arbitrary external URL
                              <img
                                src={item.photo_url}
                                alt={item.name}
                                draggable={false}
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <span className="text-4xl text-slate-300">
                                  {item.emoji ?? "📦"}
                                </span>
                              </div>
                            )}
                          </div>

                          <div>
                            <p className="truncate font-ui text-base font-semibold text-slate-700">
                              ${item.price.toFixed(2)}
                            </p>
                            {hostname && item.link && (
                              <a
                                href={
                                  item.link.startsWith("http")
                                    ? item.link
                                    : `https://${item.link}`
                                }
                                target="_blank"
                                rel="noreferrer"
                                draggable={false}
                                onClick={(e) => e.stopPropagation()}
                                className="flex min-w-0 items-center gap-1 font-ui text-xs text-sky-400 transition-colors hover:text-sky-500"
                              >
                                <span className="truncate">{hostname}</span>
                                <ExternalLinkIcon />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 font-display text-2xl tracking-wide text-slate-800">
              Add Item
            </h2>
            <div className="flex flex-col gap-3">
              <div>
                <p className="font-ui text-xs uppercase tracking-widest text-slate-400">
                  Name
                </p>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, name: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddItem();
                  }}
                  className="mt-1 w-full rounded-xl border border-sky-200 px-3 py-2 font-ui text-sm text-slate-700 outline-none transition-all focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  placeholder="Item name"
                />
              </div>
              <div>
                <p className="font-ui text-xs uppercase tracking-widest text-slate-400">
                  Photo
                </p>
                <div className="relative mt-1 h-20 w-20">
                  <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-xl bg-sky-50">
                    {addUploadingPhoto ? (
                      <p className="font-ui text-[10px] text-slate-400">
                        Uploading…
                      </p>
                    ) : addForm.photoUrl ? (
                      // biome-ignore lint/performance/noImgElement: photoUrl can be an arbitrary external URL
                      <img
                        src={addForm.photoUrl}
                        alt="Item preview"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="text-3xl text-slate-300">
                        {addForm.emoji ?? "📦"}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setAddPhotoMenuOpen((o) => !o)}
                    className="absolute -bottom-1.5 -right-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-500 shadow-md transition-colors hover:bg-sky-50 hover:text-sky-600"
                    aria-label="Edit photo"
                  >
                    <PencilIcon />
                  </button>

                  {addPhotoMenuOpen && (
                    <>
                      <button
                        type="button"
                        aria-label="Close photo menu"
                        className="fixed inset-0 z-[9] cursor-default"
                        onClick={() => {
                          setAddPhotoMenuOpen(false);
                          setAddPhotoUrlInputOpen(false);
                          setAddEmojiPickerOpen(false);
                        }}
                      />
                      <div className="absolute left-0 top-full z-20 mt-2 w-48 rounded-xl border border-sky-200 bg-white p-1.5 shadow-lg">
                        {addPhotoUrlInputOpen ? (
                          <div className="p-1.5">
                            <input
                              type="text"
                              value={addPhotoUrlValue}
                              onChange={(e) => {
                                setAddPhotoUrlValue(e.target.value);
                                if (addPhotoUrlError)
                                  setAddPhotoUrlError(false);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleAddPhotoUrlSave();
                                if (e.key === "Escape") {
                                  setAddPhotoUrlInputOpen(false);
                                  setAddPhotoUrlValue("");
                                  setAddPhotoUrlError(false);
                                }
                              }}
                              placeholder="https://example.com/photo.jpg"
                              className={cn(
                                "w-full rounded-lg border px-2.5 py-1.5 font-ui text-sm text-slate-700 outline-none",
                                addPhotoUrlError
                                  ? "border-red-300 focus:border-red-400"
                                  : "border-sky-200 focus:border-sky-300",
                              )}
                            />
                            {addPhotoUrlError && (
                              <p className="mt-1 font-ui text-xs text-red-400">
                                Please enter a valid image URL
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={handleAddPhotoUrlSave}
                              disabled={addPhotoUrlChecking}
                              className="mt-1.5 w-full rounded-lg bg-sky-50 py-1.5 font-ui text-sm text-sky-600 transition-colors hover:bg-sky-100 disabled:opacity-60"
                            >
                              {addPhotoUrlChecking ? "Checking…" : "Save"}
                            </button>
                          </div>
                        ) : addEmojiPickerOpen ? (
                          <div className="grid max-h-48 grid-cols-5 gap-1 overflow-y-auto p-1">
                            {EMOJI_OPTIONS.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => handleAddChooseEmoji(emoji)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-xl transition-colors hover:bg-sky-50"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <button
                              type="button"
                              onClick={() => setAddPhotoUrlInputOpen(true)}
                              className="rounded-lg px-3 py-2 text-left font-ui text-sm text-slate-700 transition-colors hover:bg-sky-50"
                            >
                              Paste image URL
                            </button>
                            <button
                              type="button"
                              onClick={() => addUploadInputRef.current?.click()}
                              className="rounded-lg px-3 py-2 text-left font-ui text-sm text-slate-700 transition-colors hover:bg-sky-50"
                            >
                              Upload from device
                            </button>
                            {isMobileDevice && (
                              <button
                                type="button"
                                onClick={() =>
                                  addCameraInputRef.current?.click()
                                }
                                className="rounded-lg px-3 py-2 text-left font-ui text-sm text-slate-700 transition-colors hover:bg-sky-50"
                              >
                                Take a photo
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setAddEmojiPickerOpen(true)}
                              className="rounded-lg px-3 py-2 text-left font-ui text-sm text-slate-700 transition-colors hover:bg-sky-50"
                            >
                              Choose an emoji
                            </button>
                            {(addForm.photoUrl || addForm.emoji) && (
                              <button
                                type="button"
                                onClick={handleAddRemovePhoto}
                                className="rounded-lg px-3 py-2 text-left font-ui text-sm text-red-500 transition-colors hover:bg-red-50"
                              >
                                Remove photo
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <input
                    ref={addUploadInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      handleAddPhotoFile(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                  <input
                    ref={addCameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      handleAddPhotoFile(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>
              <div>
                <p className="font-ui text-xs uppercase tracking-widest text-slate-400">
                  Price
                </p>
                <div className="mt-1 flex items-center gap-1 rounded-xl border border-sky-200 px-3 py-2 transition-all focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100">
                  <span className="font-ui text-sm text-slate-400">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={addForm.price}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, price: e.target.value }))
                    }
                    onKeyDown={handlePriceKeyDown}
                    className="w-full bg-transparent font-ui text-sm text-slate-700 outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <p className="font-ui text-xs uppercase tracking-widest text-slate-400">
                  Link
                </p>
                <input
                  type="text"
                  value={addForm.link}
                  onChange={(e) => {
                    setAddForm((f) => ({ ...f, link: e.target.value }));
                    if (addLinkError) setAddLinkError(false);
                  }}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    setAddLinkError(!!v && !isValidLink(v));
                  }}
                  className={cn(
                    "mt-1 w-full rounded-xl border px-3 py-2 font-ui text-sm text-sky-500 outline-none transition-all",
                    addLinkError
                      ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                      : "border-sky-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100",
                  )}
                  placeholder="amazon.com"
                />
                {addLinkError && (
                  <p className="mt-1 font-ui text-xs text-red-400">
                    Please enter a valid URL (e.g. amazon.com)
                  </p>
                )}
              </div>
              <div>
                <p className="font-ui text-xs uppercase tracking-widest text-slate-400">
                  Category
                </p>
                <div className="relative mt-1">
                  {addCatOpen && (
                    <button
                      type="button"
                      aria-label="Close category dropdown"
                      className="fixed inset-0 z-[9] cursor-default"
                      onClick={() => {
                        setAddCatOpen(false);
                        setAddCatSearch("");
                        setAddCatCreating(false);
                        setAddCatNewLabel("");
                      }}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setAddCatOpen((o) => !o);
                      setAddCatCreating(false);
                      setAddCatNewLabel("");
                    }}
                    className="flex w-full items-center justify-between rounded-xl border border-sky-200 px-3 py-2 font-ui text-sm transition-all hover:border-sky-300 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  >
                    <span
                      className={
                        addForm.category ? "text-slate-700" : "text-slate-400"
                      }
                    >
                      {addForm.category
                        ? (categories.find((c) => c.id === addForm.category)
                            ?.label ??
                          addCatPendingLabel ??
                          addForm.category)
                        : "Select a category"}
                    </span>
                    <ChevronDownIcon
                      className={addCatOpen ? "rotate-180" : undefined}
                    />
                  </button>
                  {addCatOpen && (
                    <div className="absolute z-10 mt-1 w-full rounded-xl border border-sky-200 bg-white shadow-lg">
                      <div className="p-1.5">
                        <input
                          type="text"
                          value={addCatSearch}
                          onChange={(e) => setAddCatSearch(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") {
                              setAddCatOpen(false);
                              setAddCatSearch("");
                            }
                          }}
                          placeholder="Search category…"
                          className="w-full rounded-lg border border-sky-100 px-2.5 py-1.5 font-ui text-sm text-slate-700 outline-none focus:border-sky-300"
                          ref={addCatInputRef}
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto">
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setAddCatCreating(true)}
                          className="flex w-full items-center gap-1.5 border-b border-sky-50 px-3 py-2 text-left font-ui text-sm text-sky-500 transition-colors hover:bg-sky-50"
                        >
                          <PlusIcon />
                          New category
                        </button>
                        {addCatCreating && (
                          <div className="border-b border-sky-50 p-1.5">
                            {addCatNewLabel.length >= 30 && (
                              <p className="mb-1 font-ui text-xs text-red-500">
                                The 30 character limit has been reached.
                              </p>
                            )}
                            <input
                              type="text"
                              ref={addCatNewLabelInputRef}
                              value={addCatNewLabel}
                              maxLength={30}
                              onChange={(e) =>
                                setAddCatNewLabel(e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const label = addCatNewLabel.trim();
                                  if (!label) return;
                                  const id = label.toLowerCase();
                                  const isExisting = categories.some(
                                    (c) => c.id === id,
                                  );
                                  setAddCatPendingLabel(
                                    isExisting ? null : label,
                                  );
                                  setAddForm((f) => ({ ...f, category: id }));
                                  setAddCatOpen(false);
                                  setAddCatSearch("");
                                  setAddCatCreating(false);
                                  setAddCatNewLabel("");
                                }
                                if (e.key === "Escape") {
                                  setAddCatCreating(false);
                                  setAddCatNewLabel("");
                                }
                              }}
                              onBlur={() => {
                                setAddCatCreating(false);
                                setAddCatNewLabel("");
                              }}
                              placeholder="New category name"
                              className="w-full rounded-lg border border-sky-200 px-2.5 py-1.5 font-ui text-sm text-slate-700 outline-none focus:border-sky-300"
                            />
                          </div>
                        )}
                        {categories
                          .filter(
                            (c) =>
                              c.id !== "all" &&
                              c.label
                                .toLowerCase()
                                .includes(addCatSearch.toLowerCase()),
                          )
                          .map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setAddForm((f) => ({
                                  ...f,
                                  category: c.id,
                                }));
                                setAddCatPendingLabel(null);
                                setAddCatOpen(false);
                                setAddCatSearch("");
                              }}
                              className={cn(
                                "w-full px-3 py-2 text-left font-ui text-sm transition-colors hover:bg-sky-50",
                                addForm.category === c.id
                                  ? "text-sky-600"
                                  : "text-slate-700",
                              )}
                            >
                              {c.label}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={closeAddModal}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 font-display tracking-wide text-slate-500 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddItem}
                disabled={
                  !addForm.name.trim() ||
                  !addForm.category ||
                  !userId ||
                  addLinkError
                }
                className="flex-1 rounded-xl border border-sky-200 bg-sky-50 py-2.5 font-display tracking-wide text-sky-600 transition-colors hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Close add from email"
            onClick={closeEmailModal}
            className="absolute inset-0 cursor-default"
          />
          <div className="relative z-10 flex w-full max-w-lg flex-col gap-4 rounded-2xl border border-sky-100 bg-white p-6 shadow-lg">
            <div>
              <h2 className="font-display text-2xl tracking-wide text-slate-800">
                Add from email
              </h2>
              <p className="mt-1 font-ui text-sm text-slate-400">
                Paste the full text of an order confirmation email below. AI
                will pull out the item, price, and store, and add it to your
                collection.
              </p>
              <p className="mt-2 font-ui text-xs text-slate-400">
                Tip: paste &ldquo;Show original&rdquo; instead of the visible
                email to also get a product photo and link. In Gmail, open the
                email and click the &#8942; (more) menu. If you don&rsquo;t see
                &ldquo;Show original&rdquo; there, click &ldquo;Switch to
                advanced toolbar&rdquo; first, then open the &#8942; menu again
                and choose &ldquo;Show original&rdquo; — paste that raw source
                here instead of the rendered email text.
              </p>
            </div>
            <textarea
              value={emailPasteText}
              onChange={(e) => setEmailPasteText(e.target.value)}
              placeholder="From: orders@store.com&#10;Subject: Your order has shipped&#10;&#10;Thanks for your order..."
              rows={10}
              disabled={emailPasteLoading}
              className="w-full resize-none rounded-xl border border-sky-100 bg-white px-4 py-3 font-ui text-sm text-slate-700 shadow-sm outline-none placeholder:text-slate-300 focus:border-sky-300 focus:ring-2 focus:ring-sky-100 transition-all disabled:opacity-60"
            />
            {emailPasteError && (
              <p className="font-ui text-sm text-red-500">{emailPasteError}</p>
            )}
            {emailPasteResult && (
              <div className="flex items-center justify-between gap-2">
                <p className="font-ui text-sm text-sky-600">
                  {emailPasteResult}
                </p>
                {emailPasteAddedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleUndoEmailPaste}
                    disabled={emailPasteUndoing}
                    className="shrink-0 font-ui text-sm font-medium text-red-500 underline decoration-dotted underline-offset-2 transition-colors hover:text-red-600 disabled:opacity-50"
                  >
                    {emailPasteUndoing ? "Undoing…" : "Undo"}
                  </button>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={closeEmailModal}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2.5 font-display tracking-wide text-slate-500 transition-colors hover:bg-slate-100"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleEmailPasteSubmit}
                disabled={!emailPasteText.trim() || emailPasteLoading}
                className="flex-1 rounded-xl border border-sky-200 bg-sky-50 py-2.5 font-display tracking-wide text-sky-600 transition-colors hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {emailPasteLoading ? "Reading…" : "Extract items"}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Close item details"
            className="fixed inset-0 cursor-default"
            onClick={closeViewItem}
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            {isEditing && viewItemId ? (
              <input
                className="mb-1 w-full bg-transparent font-display text-2xl tracking-wide text-slate-800 outline-none border-b border-sky-200 focus:border-sky-400 pb-1"
                defaultValue={viewItem.name}
                onBlur={(e) => {
                  const v = e.target.value;
                  if (v !== viewItem.name) {
                    pushHistory({
                      type: "field-edit",
                      target: "item",
                      id: viewItemId,
                      field: "name",
                      oldValue: viewItem.name,
                      newValue: v,
                    });
                    handleItemChange(viewItemId, "name", v);
                    setViewItem((prev) => (prev ? { ...prev, name: v } : prev));
                  }
                }}
              />
            ) : (
              <h2 className="mb-1 font-display text-2xl tracking-wide text-slate-800">
                {viewItem.name}
              </h2>
            )}
            {isEditing && viewItemId ? (
              <div className="relative mb-4 inline-block">
                <button
                  type="button"
                  onClick={() => setCategoryMenuOpen((o) => !o)}
                  className="flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 font-ui text-xs uppercase tracking-widest text-sky-600 transition-colors hover:bg-sky-100"
                >
                  {categories.find((c) => c.id === viewItem.category)?.label ??
                    "Select a category"}
                  <ChevronDownIcon
                    className={categoryMenuOpen ? "rotate-180" : undefined}
                  />
                </button>
                {categoryMenuOpen && (
                  <>
                    <button
                      type="button"
                      aria-label="Close category menu"
                      className="fixed inset-0 z-[9] cursor-default"
                      onClick={() => setCategoryMenuOpen(false)}
                    />
                    <div className="absolute z-20 mt-1 max-h-40 w-48 overflow-y-auto rounded-xl border border-sky-200 bg-white p-1 shadow-lg">
                      {categories
                        .filter((c) => c.id !== "all")
                        .map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleViewCategoryChange(c.id)}
                            className={cn(
                              "w-full rounded-lg px-3 py-2 text-left font-ui text-sm transition-colors hover:bg-sky-50",
                              viewItem.category === c.id
                                ? "text-sky-600"
                                : "text-slate-700",
                            )}
                          >
                            {c.label}
                          </button>
                        ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              viewItem.category && (
                <p className="mb-4 font-ui text-xs uppercase tracking-widest text-slate-400">
                  {categories.find((c) => c.id === viewItem.category)?.label ??
                    viewItem.category}
                </p>
              )
            )}
            <div
              className={cn(
                "relative flex aspect-square items-center justify-center overflow-hidden rounded-xl",
                viewItem.gradient
                  ? `bg-gradient-to-br ${viewItem.gradient}`
                  : "bg-sky-50",
              )}
            >
              {uploadingPhoto ? (
                <p className="font-ui text-sm text-slate-400">Uploading…</p>
              ) : viewItem.photoUrl ? (
                // biome-ignore lint/performance/noImgElement: photoUrl can be an arbitrary external URL
                <img
                  src={viewItem.photoUrl}
                  alt={viewItem.name}
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-8xl text-slate-300">
                  {viewItem.emoji ?? "📦"}
                </span>
              )}

              {isEditing && viewItemId && (
                <>
                  <button
                    type="button"
                    onClick={() => setPhotoMenuOpen((o) => !o)}
                    className="absolute bottom-2 right-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 shadow-md transition-colors hover:bg-sky-50 hover:text-sky-600"
                    aria-label="Edit photo"
                  >
                    <PencilIcon />
                  </button>

                  {photoMenuOpen && (
                    <>
                      <button
                        type="button"
                        aria-label="Close photo menu"
                        className="fixed inset-0 z-[9] cursor-default"
                        onClick={() => {
                          setPhotoMenuOpen(false);
                          setPhotoUrlInputOpen(false);
                          setEmojiPickerOpen(false);
                        }}
                      />
                      <div className="absolute bottom-14 right-2 z-20 w-48 rounded-xl border border-sky-200 bg-white p-1.5 shadow-lg">
                        {photoUrlInputOpen ? (
                          <div className="p-1.5">
                            <input
                              type="text"
                              value={photoUrlValue}
                              onChange={(e) => {
                                setPhotoUrlValue(e.target.value);
                                if (photoUrlError) setPhotoUrlError(false);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handlePhotoUrlSave();
                                if (e.key === "Escape") {
                                  setPhotoUrlInputOpen(false);
                                  setPhotoUrlValue("");
                                  setPhotoUrlError(false);
                                }
                              }}
                              placeholder="https://example.com/photo.jpg"
                              className={cn(
                                "w-full rounded-lg border px-2.5 py-1.5 font-ui text-sm text-slate-700 outline-none",
                                photoUrlError
                                  ? "border-red-300 focus:border-red-400"
                                  : "border-sky-200 focus:border-sky-300",
                              )}
                            />
                            {photoUrlError && (
                              <p className="mt-1 font-ui text-xs text-red-400">
                                Please enter a valid image URL
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={handlePhotoUrlSave}
                              disabled={photoUrlChecking}
                              className="mt-1.5 w-full rounded-lg bg-sky-50 py-1.5 font-ui text-sm text-sky-600 transition-colors hover:bg-sky-100 disabled:opacity-60"
                            >
                              {photoUrlChecking ? "Checking…" : "Save"}
                            </button>
                          </div>
                        ) : emojiPickerOpen ? (
                          <div className="grid max-h-48 grid-cols-5 gap-1 overflow-y-auto p-1">
                            {EMOJI_OPTIONS.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => handleChooseEmoji(emoji)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-xl transition-colors hover:bg-sky-50"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <button
                              type="button"
                              onClick={() => setPhotoUrlInputOpen(true)}
                              className="rounded-lg px-3 py-2 text-left font-ui text-sm text-slate-700 transition-colors hover:bg-sky-50"
                            >
                              Paste image URL
                            </button>
                            <button
                              type="button"
                              onClick={() => uploadInputRef.current?.click()}
                              className="rounded-lg px-3 py-2 text-left font-ui text-sm text-slate-700 transition-colors hover:bg-sky-50"
                            >
                              Upload from device
                            </button>
                            {isMobileDevice && (
                              <button
                                type="button"
                                onClick={() => cameraInputRef.current?.click()}
                                className="rounded-lg px-3 py-2 text-left font-ui text-sm text-slate-700 transition-colors hover:bg-sky-50"
                              >
                                Take a photo
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setEmojiPickerOpen(true)}
                              className="rounded-lg px-3 py-2 text-left font-ui text-sm text-slate-700 transition-colors hover:bg-sky-50"
                            >
                              Choose an emoji
                            </button>
                            {(viewItem.photoUrl || viewItem.emoji) && (
                              <button
                                type="button"
                                onClick={handleRemovePhoto}
                                className="rounded-lg px-3 py-2 text-left font-ui text-sm text-red-500 transition-colors hover:bg-red-50"
                              >
                                Remove photo
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <input
                    ref={uploadInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      handlePhotoFile(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      handlePhotoFile(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </>
              )}
            </div>
            {isEditing && viewItemId ? (
              <div className="mt-4 flex flex-col gap-1">
                <div className="flex items-center gap-0.5">
                  <span className="font-ui text-2xl font-semibold text-slate-700">
                    $
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full bg-transparent font-ui text-2xl font-semibold text-slate-700 outline-none border-b border-sky-200 focus:border-sky-400 pb-0.5"
                    defaultValue={viewItem.price.toFixed(2)}
                    onKeyDown={handlePriceKeyDown}
                    onBlur={(e) => {
                      const v = parseFloat(e.target.value) || 0;
                      if (v !== viewItem.price) {
                        pushHistory({
                          type: "field-edit",
                          target: "item",
                          id: viewItemId,
                          field: "price",
                          oldValue: viewItem.price,
                          newValue: v,
                        });
                        handleItemChange(viewItemId, "price", v);
                        setViewItem((prev) =>
                          prev ? { ...prev, price: v } : prev,
                        );
                      }
                    }}
                  />
                </div>
                <input
                  className={cn(
                    "w-full bg-transparent font-ui text-sm text-sky-400 outline-none border-b pb-0.5",
                    linkErrorId === viewItemId
                      ? "border-red-400 focus:border-red-400"
                      : "border-sky-200 focus:border-sky-400",
                  )}
                  placeholder="Website URL"
                  defaultValue={viewItem.link ?? ""}
                  onFocus={() => setLinkErrorId(null)}
                  onBlur={(e) => {
                    const v = e.target.value;
                    if (!isValidLink(v)) {
                      setLinkErrorId(viewItemId);
                      e.target.value = viewItem.link ?? "";
                      return;
                    }
                    setLinkErrorId(null);
                    if (v !== (viewItem.link ?? "")) {
                      pushHistory({
                        type: "field-edit",
                        target: "item",
                        id: viewItemId,
                        field: "link",
                        oldValue: viewItem.link,
                        newValue: v,
                      });
                      handleItemChange(viewItemId, "link", v);
                      setViewItem((prev) =>
                        prev ? { ...prev, link: v } : prev,
                      );
                    }
                  }}
                />
                {linkErrorId === viewItemId && (
                  <p className="mt-0.5 font-ui text-xs text-red-400">
                    Invalid URL
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-4 flex items-center justify-between">
                <p className="font-ui text-2xl font-semibold text-slate-700">
                  ${viewItem.price.toFixed(2)}
                </p>
                {viewItem.link && (
                  <a
                    href={
                      viewItem.link.startsWith("http")
                        ? viewItem.link
                        : `https://${viewItem.link}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-w-0 items-center gap-1 font-ui text-sm text-sky-400 transition-colors hover:text-sky-500"
                  >
                    <span className="truncate">
                      {linkHostname(viewItem.link)}
                    </span>
                    <ExternalLinkIcon />
                  </a>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={closeViewItem}
              className="mt-5 w-full rounded-xl border border-slate-200 py-2.5 font-display tracking-wide text-slate-500 transition-colors hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
