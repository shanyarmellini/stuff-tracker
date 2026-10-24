const MONEY_UNITS = [
  { value: 1_000_000_000, suffix: "B" },
  { value: 1_000_000, suffix: "M" },
  { value: 1_000, suffix: "K" },
];

/** Compact dollar amount: $1.5K, $2M, or $12.34 below a thousand. */
export function formatMoney(value: number): string {
  for (const unit of MONEY_UNITS) {
    if (value >= unit.value) {
      const scaled = (value / unit.value).toFixed(1).replace(/\.0$/, "");
      return `$${scaled}${unit.suffix}`;
    }
  }
  return formatPrice(value);
}

export function formatPrice(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function formatDate(iso: string | undefined | null): string {
  if (!iso) return "Unknown";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
