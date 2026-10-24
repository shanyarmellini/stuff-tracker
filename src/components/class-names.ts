// Shared className strings reused across pages.

/** Rounded bordered card used for sections on account/settings pages. */
export const SECTION_CARD_CLASS =
  "rounded-2xl border border-border bg-card p-5 shadow-sm";

/** Large centred card wrapping each onboarding step. */
export const ONBOARDING_CARD_CLASS =
  "w-full max-w-lg rounded-3xl border border-border bg-card p-10 shadow-sm";

export const ONBOARDING_TITLE_CLASS =
  "mb-1 font-display text-3xl tracking-wide text-foreground";

export const FIELD_LABEL_CLASS =
  "mb-3 block font-ui text-sm font-medium text-foreground";

/** Text input / select styling (combine with width + horizontal padding). */
export const FIELD_INPUT_CLASS =
  "rounded-xl border border-border bg-card py-2.5 font-ui text-sm text-foreground shadow-sm outline-none placeholder:text-subtle-foreground focus:border-ring focus:ring-2 focus:ring-ring/30 transition-all disabled:cursor-not-allowed disabled:opacity-50";

/** Full-width brand submit button. */
export const SUBMIT_BUTTON_CLASS =
  "mt-2 w-full rounded-xl bg-brand py-3 font-ui text-sm font-medium text-brand-foreground shadow-sm transition-colors hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60";

/** Full-width destructive card button (log out, delete account). */
export const DANGER_CARD_BUTTON_CLASS =
  "w-full rounded-2xl border border-destructive/30 bg-card p-4 text-center font-ui text-sm text-destructive shadow-sm transition-colors hover:bg-destructive/10";
