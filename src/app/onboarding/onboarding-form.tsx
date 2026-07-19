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

const MAX_ITEM_TYPES = 20;

const GENDERS = ["Woman", "Man", "Non-binary", "Prefer not to say"];

const CURRENT_YEAR = new Date().getFullYear();
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const YEARS = Array.from({ length: 121 }, (_, i) => CURRENT_YEAR - i);

function calcAge(month: number, day: number, year: number): number {
  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() + 1 - month;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) age--;
  return age;
}

export function OnboardingForm() {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [otherActive, setOtherActive] = useState(false);
  const [otherText, setOtherText] = useState("");
  const [otherItems, setOtherItems] = useState<string[]>([]);
  const [errors, setErrors] = useState<ValidationError>({});
  const [dobMonth, setDobMonth] = useState("");
  const [dobDay, setDobDay] = useState("");
  const [dobYear, setDobYear] = useState("");

  const totalItemTypes = selectedTypes.length + otherItems.length;
  const itemTypesMaxed = totalItemTypes >= MAX_ITEM_TYPES;

  function toggleType(type: string) {
    setSelectedTypes((prev) => {
      if (prev.includes(type)) return prev.filter((t) => t !== type);
      if (totalItemTypes >= MAX_ITEM_TYPES) return prev;
      return [...prev, type];
    });
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
    if (trimmed && !otherItems.includes(trimmed) && !itemTypesMaxed) {
      setOtherItems((prev) => [...prev, trimmed]);
    }
    setOtherText("");
  }

  function removeOtherItem(item: string) {
    setOtherItems((prev) => prev.filter((i) => i !== item));
  }

  const dobComplete = dobMonth !== "" && dobDay !== "" && dobYear.length === 4;
  const dobAge = dobComplete
    ? calcAge(Number(dobMonth), Number(dobDay), Number(dobYear))
    : null;
  const dobTooYoung = dobAge !== null && dobAge < 13;
  const dobTooOld = dobAge !== null && dobAge > 120;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const pendingOther = otherText.trim();
    let finalOtherItems = otherItems;
    if (pendingOther && !otherItems.includes(pendingOther) && !itemTypesMaxed) {
      finalOtherItems = [...otherItems, pendingOther];
      setOtherItems(finalOtherItems);
      setOtherText("");
    }

    const allItemTypes = selectedTypes.length + finalOtherItems.length;
    const gender = formData.get("gender") as string | null;

    const newErrors: ValidationError = {};
    if (allItemTypes === 0)
      newErrors.itemTypes = "Please select at least one item type.";
    if (!gender) newErrors.gender = "Please select how you identify.";
    if (!dobComplete) {
      newErrors.age = "Please enter your full date of birth.";
    } else if (dobTooYoung) {
      newErrors.age = "You must be at least 13 years old.";
    } else if (dobTooOld) {
      newErrors.age = "The maximum age is 120.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    formData.set("age", String(dobAge));
    for (const item of finalOtherItems) {
      formData.append("item_types", item);
    }
    await saveOnboarding(formData);
  }

  return (
    <div className="w-full max-w-lg rounded-3xl border border-sky-100 bg-white p-10 shadow-sm">
      <h1 className="mb-1 font-display text-3xl tracking-wide text-slate-800">
        Welcome!
      </h1>
      <p className="mb-8 font-ui text-sm text-slate-400">
        Tell us a bit about yourself so we can tailor your experience.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
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
            <br />
            <span className="font-normal text-slate-400">
              Max {MAX_ITEM_TYPES} categories
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            {ITEM_TYPES.map((type) => {
              const active = selectedTypes.includes(type);
              const disabled = !active && itemTypesMaxed;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleType(type)}
                  disabled={disabled}
                  className={cn(
                    "rounded-full border px-4 py-1.5 font-ui text-sm transition-colors",
                    active
                      ? "border-sky-400 bg-sky-400 text-white"
                      : "border-sky-200 bg-white text-slate-500 hover:border-sky-300 hover:text-sky-600",
                    disabled &&
                      "cursor-not-allowed opacity-40 hover:border-sky-200 hover:text-slate-500",
                  )}
                >
                  {type}
                </button>
              );
            })}
            <button
              type="button"
              onClick={toggleOther}
              disabled={!otherActive && itemTypesMaxed}
              className={cn(
                "rounded-full border px-4 py-1.5 font-ui text-sm transition-colors",
                otherActive
                  ? "border-sky-400 bg-sky-400 text-white"
                  : "border-sky-200 bg-white text-slate-500 hover:border-sky-300 hover:text-sky-600",
                !otherActive &&
                  itemTypesMaxed &&
                  "cursor-not-allowed opacity-40 hover:border-sky-200 hover:text-slate-500",
              )}
            >
              Other
            </button>
          </div>
          {itemTypesMaxed && (
            <p className="mt-2 font-ui text-xs text-slate-400">
              You&apos;ve reached the maximum of {MAX_ITEM_TYPES} categories.
            </p>
          )}
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
              {otherText.length >= 30 && (
                <p className="mb-1 font-ui text-xs text-red-500">
                  The 30 character limit has been reached.
                </p>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Vintage clothing"
                  maxLength={30}
                  value={otherText}
                  disabled={itemTypesMaxed}
                  onChange={(e) => setOtherText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitOtherItem();
                    }
                  }}
                  className="flex-1 rounded-xl border border-sky-100 bg-white px-4 py-2.5 font-ui text-sm text-slate-700 shadow-sm outline-none placeholder:text-slate-300 focus:border-sky-300 focus:ring-2 focus:ring-sky-100 transition-all disabled:cursor-not-allowed disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={commitOtherItem}
                  disabled={itemTypesMaxed}
                  className="rounded-xl border border-sky-200 bg-white px-4 py-2.5 font-ui text-sm text-slate-500 transition-colors hover:border-sky-300 hover:text-sky-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-sky-200 disabled:hover:text-slate-500"
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
            <p className="mt-2 font-ui text-xs text-red-500">{errors.gender}</p>
          )}
        </div>

        {/* Date of birth */}
        <div>
          <p className="mb-3 font-ui text-sm font-medium text-slate-700">
            What is your date of birth?
          </p>
          <div className="flex gap-3">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="dob-month"
                className="font-ui text-xs text-slate-400"
              >
                Month
              </label>
              <select
                id="dob-month"
                value={dobMonth}
                onChange={(e) => setDobMonth(e.target.value)}
                className="w-36 rounded-xl border border-sky-100 bg-white px-3 py-2.5 font-ui text-sm text-slate-700 shadow-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100 transition-all"
              >
                <option value="" disabled>
                  MM
                </option>
                {MONTH_NAMES.map((name, i) => (
                  <option key={name} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label
                htmlFor="dob-day"
                className="font-ui text-xs text-slate-400"
              >
                Day
              </label>
              <select
                id="dob-day"
                value={dobDay}
                onChange={(e) => setDobDay(e.target.value)}
                className="w-20 rounded-xl border border-sky-100 bg-white px-3 py-2.5 font-ui text-sm text-slate-700 shadow-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100 transition-all"
              >
                <option value="" disabled>
                  DD
                </option>
                {DAYS.map((d) => (
                  <option key={d} value={d}>
                    {String(d).padStart(2, "0")}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label
                htmlFor="dob-year"
                className="font-ui text-xs text-slate-400"
              >
                Year
              </label>
              <select
                id="dob-year"
                value={dobYear}
                onChange={(e) => setDobYear(e.target.value)}
                className="w-28 rounded-xl border border-sky-100 bg-white px-3 py-2.5 font-ui text-sm text-slate-700 shadow-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100 transition-all"
              >
                <option value="" disabled>
                  YYYY
                </option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {dobTooYoung && (
            <p className="mt-2 font-ui text-xs text-red-500">
              You must be at least 13 years old.
            </p>
          )}
          {dobTooOld && (
            <p className="mt-2 font-ui text-xs text-red-500">
              The maximum age is 120.
            </p>
          )}
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
  );
}
