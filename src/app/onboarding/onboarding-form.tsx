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
  gender?: string;
  age?: string;
};

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

export function OnboardingForm({
  onSubmit = saveOnboarding,
}: {
  // Where the answers are saved; the admin mock onboarding saves to another
  // user instead of the signed-in one.
  onSubmit?: (formData: FormData) => Promise<void>;
} = {}) {
  const [errors, setErrors] = useState<ValidationError>({});
  const [dobMonth, setDobMonth] = useState("");
  const [dobDay, setDobDay] = useState("");
  const [dobYear, setDobYear] = useState("");

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
    const gender = formData.get("gender") as string | null;

    const newErrors: ValidationError = {};
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
    await onSubmit(formData);
  }

  return (
    <div className={ONBOARDING_CARD_CLASS}>
      <h1 className={ONBOARDING_TITLE_CLASS}>Almost done!</h1>
      <p className="mb-8 font-ui text-sm text-subtle-foreground">
        Tell us a bit about yourself so we can tailor your experience.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
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
