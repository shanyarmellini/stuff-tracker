import { CheckIcon } from "~/components/icons";
import { formatMoney } from "~/lib/format";
import { cn } from "~/lib/utils";
import { CARD_SURFACE } from "../_lib/styles";

function StatCard({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string | number;
  valueClassName: string;
}) {
  return (
    <div className={cn("rounded-2xl p-5 shadow-sm", CARD_SURFACE)}>
      <p className="font-ui text-xs uppercase tracking-widest text-subtle-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-display tracking-wide text-foreground",
          valueClassName,
        )}
      >
        {value}
      </p>
    </div>
  );
}

/** Totals, plus Cancel/Done while editing. */
export function StatsRow({
  itemCount,
  totalSpent,
  isEditing,
  onCancel,
  onDone,
}: {
  itemCount: number;
  totalSpent: number;
  isEditing: boolean;
  onCancel: () => void;
  onDone: () => void;
}) {
  return (
    <div
      className={cn(
        "mb-8 grid gap-4",
        isEditing ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2",
      )}
    >
      <StatCard
        label="Total Items"
        value={itemCount}
        valueClassName="text-3xl"
      />
      <StatCard
        label="Money Spent"
        value={formatMoney(totalSpent)}
        valueClassName="text-2xl"
      />
      {isEditing && (
        <>
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-muted p-5 shadow-sm transition-colors hover:bg-input"
          >
            <span className="font-display text-lg tracking-wide text-muted-foreground">
              Cancel
            </span>
          </button>
          <button
            type="button"
            onClick={onDone}
            className="flex items-center justify-center gap-2 rounded-2xl border border-success/30 bg-success/10 p-5 shadow-sm transition-colors hover:bg-success/20"
          >
            <CheckIcon />
            <span className="font-display text-lg tracking-wide text-success">
              Done
            </span>
          </button>
        </>
      )}
    </div>
  );
}
