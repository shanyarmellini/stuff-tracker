"use client";

import { useState } from "react";
import { cn } from "~/lib/utils";

const categories = [
  { id: "all", label: "All" },
  { id: "skincare", label: "Skincare" },
  { id: "makeup", label: "Makeup" },
  { id: "hair", label: "Hair" },
  { id: "fragrance", label: "Fragrance" },
  { id: "tools", label: "Tools" },
  { id: "misc", label: "Misc" },
];

const items = [
  {
    id: 1,
    name: "CeraVe Moisturizing Cream",
    category: "skincare",
    cost: 19.99,
    website: "amazon.com",
    addedDate: "2026-06-20",
    gradient: "from-sky-100 to-cyan-50",
    emoji: "🧴",
  },
  {
    id: 2,
    name: "NARS Soft Matte Foundation",
    category: "makeup",
    cost: 48.0,
    website: "sephora.com",
    addedDate: "2026-06-18",
    gradient: "from-rose-100 to-pink-50",
    emoji: "💄",
  },
  {
    id: 3,
    name: "Olaplex No.3 Treatment",
    category: "hair",
    cost: 30.0,
    website: "ulta.com",
    addedDate: "2026-06-15",
    gradient: "from-violet-100 to-purple-50",
    emoji: "✨",
  },
  {
    id: 4,
    name: "Maison Margiela Replica",
    category: "fragrance",
    cost: 165.0,
    website: "nordstrom.com",
    addedDate: "2026-06-12",
    gradient: "from-amber-100 to-yellow-50",
    emoji: "🌸",
  },
  {
    id: 5,
    name: "Beautyblender Original",
    category: "tools",
    cost: 22.0,
    website: "target.com",
    addedDate: "2026-06-10",
    gradient: "from-pink-100 to-fuchsia-50",
    emoji: "🔮",
  },
  {
    id: 6,
    name: "The Ordinary Niacinamide",
    category: "skincare",
    cost: 11.9,
    website: "theordinary.com",
    addedDate: "2026-06-08",
    gradient: "from-teal-100 to-emerald-50",
    emoji: "🧪",
  },
  {
    id: 7,
    name: "Charlotte Tilbury Pillow Talk",
    category: "makeup",
    cost: 32.0,
    website: "charlottetilbury.com",
    addedDate: "2026-06-05",
    gradient: "from-red-100 to-rose-50",
    emoji: "💋",
  },
  {
    id: 8,
    name: "Dyson Airwrap Complete",
    category: "tools",
    cost: 599.99,
    website: "dyson.com",
    addedDate: "2026-06-01",
    gradient: "from-indigo-100 to-blue-50",
    emoji: "💨",
  },
];

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

export default function DashboardPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");

  const filteredItems = items
    .filter(
      (item) => activeCategory === "all" || item.category === activeCategory,
    )
    .filter((item) => item.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.addedDate.localeCompare(a.addedDate));

  const totalSpent = items.reduce((sum, item) => sum + item.cost, 0);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-sky-50">
      {/* ── Sidebar ── */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-sky-100 bg-white">
        <div className="flex flex-col gap-0.5 px-3 py-6">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "rounded-xl px-4 py-2.5 text-left text-sm transition-colors font-display tracking-wide",
                activeCategory === cat.id
                  ? "bg-sky-100 text-sky-700"
                  : "text-slate-500 hover:bg-sky-50 hover:text-sky-600",
              )}
            >
              {cat.label}
            </button>
          ))}
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
            className="rounded-lg border border-sky-200 bg-white px-4 py-1.5 text-xs text-slate-500 font-ui transition-colors hover:bg-sky-50 hover:text-sky-600"
          >
            Email
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
            <p className="font-ui text-sm text-slate-400">example@gmail.com</p>
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
          <div className="mb-8 grid grid-cols-3 gap-4">
            <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
              <p className="font-ui text-xs uppercase tracking-widest text-slate-400">
                Total Items
              </p>
              <p className="mt-1 font-display text-3xl tracking-wide text-slate-800">
                {items.length}
              </p>
            </div>
            <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
              <p className="font-ui text-xs uppercase tracking-widest text-slate-400">
                Money Spent
              </p>
              <p className="mt-1 font-display text-3xl tracking-wide text-slate-800">
                ${totalSpent.toFixed(2)}
              </p>
            </div>
            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 p-5 shadow-sm transition-colors hover:bg-sky-100"
            >
              <PencilIcon />
              <span className="font-display text-lg tracking-wide text-sky-600">
                Edit Items
              </span>
            </button>
          </div>

          {/* Recently Added */}
          <div className="mb-4 flex items-baseline gap-2">
            <h2 className="font-display text-2xl tracking-wide text-slate-700">
              Recently Added
            </h2>
            {activeCategory !== "all" && (
              <span className="font-ui text-sm text-slate-400 capitalize">
                · {activeCategory}
              </span>
            )}
          </div>

          {filteredItems.length === 0 ? (
            <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-sky-200 bg-white">
              <p className="font-ui text-sm text-slate-400">No items found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="flex aspect-square flex-col rounded-2xl border border-sky-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  {/* Name */}
                  <p className="line-clamp-2 font-display text-sm leading-tight tracking-wide text-slate-800">
                    {item.name}
                  </p>

                  {/* Image / emoji */}
                  <div
                    className={cn(
                      "my-3 flex flex-1 items-center justify-center rounded-xl bg-gradient-to-br",
                      item.gradient,
                    )}
                  >
                    <span className="text-5xl">{item.emoji}</span>
                  </div>

                  {/* Cost + link */}
                  <div>
                    <p className="font-ui text-sm font-semibold text-slate-700">
                      ${item.cost.toFixed(2)}
                    </p>
                    <a
                      href={`https://${item.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 font-ui text-xs text-sky-400 transition-colors hover:text-sky-500"
                    >
                      {item.website}
                      <ExternalLinkIcon />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
