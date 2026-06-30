"use client";

import { useState } from "react";
import { cn } from "~/lib/utils";
import { saveOnboarding } from "./actions";

const ITEM_TYPES = [
  "Skincare",
  "Makeup",
  "Hair",
  "Fragrance",
  "Tools",
  "Clothing",
  "Electronics",
  "Books",
  "Fitness",
  "Misc",
];

const GENDERS = ["Woman", "Man", "Non-binary", "Prefer not to say"];

export default function OnboardingPage() {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  function toggleType(type: string) {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center bg-sky-50 px-4">
      <div className="w-full max-w-lg rounded-3xl border border-sky-100 bg-white p-10 shadow-sm">
        <h1 className="mb-1 font-display text-3xl tracking-wide text-slate-800">
          Welcome!
        </h1>
        <p className="mb-8 font-ui text-sm text-slate-400">
          Tell us a bit about yourself so we can tailor your experience.
        </p>

        <form action={saveOnboarding} className="flex flex-col gap-8">
          {/* Hidden inputs for selected item types */}
          {selectedTypes.map((type) => (
            <input key={type} type="hidden" name="item_types" value={type} />
          ))}

          {/* Item types */}
          <div>
            <label className="mb-3 block font-ui text-sm font-medium text-slate-700">
              What kind of items do you usually buy?
              <span className="ml-1 font-normal text-slate-400">
                (pick all that apply)
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              {ITEM_TYPES.map((type) => {
                const active = selectedTypes.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleType(type)}
                    className={cn(
                      "rounded-full border px-4 py-1.5 font-ui text-sm transition-colors",
                      active
                        ? "border-sky-400 bg-sky-400 text-white"
                        : "border-sky-200 bg-white text-slate-500 hover:border-sky-300 hover:text-sky-600",
                    )}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Gender */}
          <div>
            <label
              htmlFor="gender"
              className="mb-3 block font-ui text-sm font-medium text-slate-700"
            >
              How do you identify?
            </label>
            <div className="flex flex-wrap gap-2">
              {GENDERS.map((g) => (
                <label
                  key={g}
                  className={cn(
                    "cursor-pointer rounded-full border px-4 py-1.5 font-ui text-sm transition-colors",
                    "has-[:checked]:border-sky-400 has-[:checked]:bg-sky-400 has-[:checked]:text-white",
                    "border-sky-200 bg-white text-slate-500 hover:border-sky-300 hover:text-sky-600",
                  )}
                >
                  <input
                    type="radio"
                    name="gender"
                    value={g}
                    className="sr-only"
                  />
                  {g}
                </label>
              ))}
            </div>
          </div>

          {/* Age */}
          <div>
            <label
              htmlFor="age"
              className="mb-3 block font-ui text-sm font-medium text-slate-700"
            >
              How old are you?
            </label>
            <input
              id="age"
              type="number"
              name="age"
              min={13}
              max={120}
              placeholder="e.g. 27"
              className="w-32 rounded-xl border border-sky-100 bg-white px-4 py-2.5 font-ui text-sm text-slate-700 shadow-sm outline-none placeholder:text-slate-300 focus:border-sky-300 focus:ring-2 focus:ring-sky-100 transition-all"
            />
          </div>

          <button
            type="submit"
            className="mt-2 w-full rounded-xl bg-sky-500 py-3 font-ui text-sm font-medium text-white shadow-sm transition-colors hover:bg-sky-600"
          >
            Get started
          </button>
        </form>
      </div>
    </div>
  );
}
