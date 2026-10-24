"use client";

import { useState } from "react";
import {
  FIELD_INPUT_CLASS,
  FIELD_LABEL_CLASS,
  ONBOARDING_CARD_CLASS,
  ONBOARDING_TITLE_CLASS,
  SUBMIT_BUTTON_CLASS,
} from "~/components/class-names";
import { cn } from "~/lib/utils";
import { saveOnboarding } from "./actions";
import { MAX_AGE, MIN_AGE } from "./constants";

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
const MAX_OTHER_LENGTH = 30;

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
const MONTH_OPTIONS = MONTH_NAMES.map((label, i) => ({ value: i + 1, label }));
const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => ({
  value: i + 1,
  label: String(i + 1).padStart(2, "0"),
}));
const YEAR_OPTIONS = Array.from({ length: MAX_AGE + 1 }, (_, i) => ({
  value: CURRENT_YEAR - i,
  label: String(CURRENT_YEAR - i),
}));

function calcAge(month: number, day: number, year: number): number {
  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() + 1 - month;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) age--;
  return age;
}

function ageRangeError(age: number): string | null {
  if (age < MIN_AGE) return `You must be at least ${MIN_AGE} years old.`;
  if (age > MAX_AGE) return `The maximum age is ${MAX_AGE}.`;
  return null;
}

function pillClass(active: boolean, disabled: boolean) {
  return cn(
    "rounded-full border px-4 py-1.5 font-ui text-sm transition-colors",
    active
      ? "border-brand bg-brand text-brand-foreground"
      : "border-input bg-card text-muted-foreground hover:border-brand hover:text-brand-strong",
    disabled &&
      "cursor-not-allowed opacity-40 hover:border-input hover:text-muted-foreground",
  );
}

function DobSelect({
  id,
  label,
  placeholder,
  value,
  onChange,
  options,
  className,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: number; label: string }[];
  className: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-ui text-xs text-subtle-foreground">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(FIELD_INPUT_CLASS, "px-3", className)}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
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

  /** Adds the typed "Other" text as an item; returns the resulting list. */
  function commitOtherItem(): string[] {
    const trimmed = otherText.trim();
    setOtherText("");
    if (!trimmed || otherItems.includes(trimmed) || itemTypesMaxed) {
      return otherItems;
    }
    const next = [...otherItems, trimmed];
    setOtherItems(next);
    return next;
  }

  function removeOtherItem(item: string) {
    setOtherItems((prev) => prev.filter((i) => i !== item));
  }

  const dobComplete = dobMonth !== "" && dobDay !== "" && dobYear.length === 4;
  const dobAge = dobComplete
    ? calcAge(Number(dobMonth), Number(dobDay), Number(dobYear))
    : null;
  // Range errors show live once the date is complete; the "incomplete" error
  // only appears after a submit attempt.
  const dobError = dobAge === null ? errors.age : ageRangeError(dobAge);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const finalOtherItems = commitOtherItem();

    const allItemTypes = selectedTypes.length + finalOtherItems.length;
    const gender = formData.get("gender") as string | null;

    const newErrors: ValidationError = {};
    if (allItemTypes === 0)
      newErrors.itemTypes = "Please select at least one item type.";
    if (!gender) newErrors.gender = "Please select how you identify.";
    const dobProblem =
      dobAge === null
        ? "Please enter your full date of birth."
        : ageRangeError(dobAge);
    if (dobProblem) newErrors.age = dobProblem;

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
    <div className={ONBOARDING_CARD_CLASS}>
      <h1 className={ONBOARDING_TITLE_CLASS}>Welcome!</h1>
      <p className="mb-8 font-ui text-sm text-subtle-foreground">
        Tell us a bit about yourself so we can tailor your experience.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        {selectedTypes.map((type) => (
          <input key={type} type="hidden" name="item_types" value={type} />
        ))}

        <div>
          <p className="mb-3 font-ui text-sm font-medium text-foreground">
            What kind of items do you usually buy?
            <span className="ml-1 font-normal text-subtle-foreground">
              (pick all that apply)
            </span>
            <br />
            <span className="font-normal text-subtle-foreground">
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
                  className={pillClass(active, disabled)}
                >
                  {type}
                </button>
              );
            })}
            <button
              type="button"
              onClick={toggleOther}
              disabled={!otherActive && itemTypesMaxed}
              className={pillClass(otherActive, !otherActive && itemTypesMaxed)}
            >
              Other
            </button>
          </div>
          {itemTypesMaxed && (
            <p className="mt-2 font-ui text-xs text-subtle-foreground">
              You&apos;ve reached the maximum of {MAX_ITEM_TYPES} categories.
            </p>
          )}
          {errors.itemTypes && (
            <p className="mt-2 font-ui text-xs text-destructive">
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
                      className="flex items-center gap-1.5 rounded-full border border-brand bg-brand px-3 py-1 font-ui text-sm text-brand-foreground"
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
              {otherText.length >= MAX_OTHER_LENGTH && (
                <p className="mb-1 font-ui text-xs text-destructive">
                  The {MAX_OTHER_LENGTH} character limit has been reached.
                </p>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Vintage clothing"
                  maxLength={MAX_OTHER_LENGTH}
                  value={otherText}
                  disabled={itemTypesMaxed}
                  onChange={(e) => setOtherText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitOtherItem();
                    }
                  }}
                  className={cn(FIELD_INPUT_CLASS, "flex-1 px-4")}
                />
                <button
                  type="button"
                  onClick={() => commitOtherItem()}
                  disabled={itemTypesMaxed}
                  className="rounded-xl border border-input bg-card px-4 py-2.5 font-ui text-sm text-muted-foreground transition-colors hover:border-brand hover:text-brand-strong disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-input disabled:hover:text-muted-foreground"
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="gender" className={FIELD_LABEL_CLASS}>
            How do you identify?
          </label>
          <div className="flex flex-wrap gap-2">
            {GENDERS.map((g) => (
              <label
                key={g}
                className={cn(
                  "cursor-pointer rounded-full border px-4 py-1.5 font-ui text-sm transition-colors",
                  "has-[:checked]:border-brand has-[:checked]:bg-brand has-[:checked]:text-brand-foreground",
                  "border-input bg-card text-muted-foreground hover:border-brand hover:text-brand-strong",
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
            <p className="mt-2 font-ui text-xs text-destructive">
              {errors.gender}
            </p>
          )}
        </div>

        <div>
          <p className="mb-3 font-ui text-sm font-medium text-foreground">
            What is your date of birth?
          </p>
          <div className="flex gap-3">
            <DobSelect
              id="dob-month"
              label="Month"
              placeholder="MM"
              value={dobMonth}
              onChange={setDobMonth}
              options={MONTH_OPTIONS}
              className="w-36"
            />
            <DobSelect
              id="dob-day"
              label="Day"
              placeholder="DD"
              value={dobDay}
              onChange={setDobDay}
              options={DAY_OPTIONS}
              className="w-20"
            />
            <DobSelect
              id="dob-year"
              label="Year"
              placeholder="YYYY"
              value={dobYear}
              onChange={setDobYear}
              options={YEAR_OPTIONS}
              className="w-28"
            />
          </div>
          {dobError && (
            <p className="mt-2 font-ui text-xs text-destructive">{dobError}</p>
          )}
        </div>

        <button type="submit" className={SUBMIT_BUTTON_CLASS}>
          Get started
        </button>
      </form>
    </div>
  );
}
