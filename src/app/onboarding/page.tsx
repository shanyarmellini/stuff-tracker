"use client";

import { useState } from "react";
import { cn } from "~/lib/utils";
import { saveOnboarding } from "./actions";

type ValidationError = {
  itemTypes?: string;
  gender?: string;
  age?: string;
};

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
  const [otherActive, setOtherActive] = useState(false);
  const [otherText, setOtherText] = useState("");
  const [otherItems, setOtherItems] = useState<string[]>([]);
  const [errors, setErrors] = useState<ValidationError>({});

  function toggleType(type: string) {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }

  function toggleOther() {
    if (otherActive) {
      setOtherActive(false);
      setOtherText("");
      setOtherItems([]);
    } else {
      setOtherActive(true);
    }
  }

  function commitOtherItem() {
    const trimmed = otherText.trim();
    if (trimmed && !otherItems.includes(trimmed)) {
      setOtherItems((prev) => [...prev, trimmed]);
    }
    setOtherText("");
  }

  function removeOtherItem(item: string) {
    setOtherItems((prev) => prev.filter((i) => i !== item));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // Auto-commit any pending other text
    const pendingOther = otherText.trim();
    let finalOtherItems = otherItems;
    if (pendingOther && !otherItems.includes(pendingOther)) {
      finalOtherItems = [...otherItems, pendingOther];
      setOtherItems(finalOtherItems);
      setOtherText("");
    }

    const allItemTypes = selectedTypes.length + finalOtherItems.length;
    const gender = formData.get("gender") as string | null;
    const age = formData.get("age") as string | null;

    const newErrors: ValidationError = {};
    if (allItemTypes === 0)
      newErrors.itemTypes = "Please select at least one item type.";
    if (!gender) newErrors.gender = "Please select how you identify.";
    if (!age || Number(age) < 13)
      newErrors.age = "Please enter a valid age (13+).";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    // Append auto-committed other items to formData before submitting
    for (const item of finalOtherItems) {
      formData.append("item_types", item);
    }
    await saveOnboarding(formData);
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          {/* Hidden inputs for selected item types */}
          {selectedTypes.map((type) => (
            <input key={type} type="hidden" name="item_types" value={type} />
          ))}

          {/* Item types */}
          <div>
            <p className="mb-3 font-ui text-sm font-medium text-slate-700">
              What kind of items do you usually buy?
              <span className="ml-1 font-normal text-slate-400">
                (pick all that apply)
              </span>
            </p>
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
              <button
                type="button"
                onClick={toggleOther}
                className={cn(
                  "rounded-full border px-4 py-1.5 font-ui text-sm transition-colors",
                  otherActive
                    ? "border-sky-400 bg-sky-400 text-white"
                    : "border-sky-200 bg-white text-slate-500 hover:border-sky-300 hover:text-sky-600",
                )}
              >
                Other
              </button>
            </div>
            {errors.itemTypes && (
              <p className="mt-2 font-ui text-xs text-red-500">
                {errors.itemTypes}
              </p>
            )}
            {otherActive && (
              <div className="mt-2">
                {otherItems.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {otherItems.map((item) => (
                      <span
                        key={item}
                        className="flex items-center gap-1.5 rounded-full border border-sky-400 bg-sky-400 px-3 py-1 font-ui text-sm text-white"
                      >
                        {item}
                        <button
                          type="button"
                          onClick={() => removeOtherItem(item)}
                          className="leading-none opacity-70 hover:opacity-100"
                          aria-label={`Remove ${item}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Vintage clothing"
                    value={otherText}
                    onChange={(e) => setOtherText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitOtherItem();
                      }
                    }}
                    className="flex-1 rounded-xl border border-sky-100 bg-white px-4 py-2.5 font-ui text-sm text-slate-700 shadow-sm outline-none placeholder:text-slate-300 focus:border-sky-300 focus:ring-2 focus:ring-sky-100 transition-all"
                  />
                  <button
                    type="button"
                    onClick={commitOtherItem}
                    className="rounded-xl border border-sky-200 bg-white px-4 py-2.5 font-ui text-sm text-slate-500 transition-colors hover:border-sky-300 hover:text-sky-600"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
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
            {errors.gender && (
              <p className="mt-2 font-ui text-xs text-red-500">
                {errors.gender}
              </p>
            )}
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
            {errors.age && (
              <p className="mt-2 font-ui text-xs text-red-500">{errors.age}</p>
            )}
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
