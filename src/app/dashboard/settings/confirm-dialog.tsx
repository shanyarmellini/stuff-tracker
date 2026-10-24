"use client";

import { MODAL_BACKDROP, MODAL_PANEL } from "~/app/dashboard/_lib/styles";
import { buttonVariants } from "~/components/ui/button";

export function ConfirmDialog({
  message,
  pending,
  onConfirm,
  onCancel,
}: {
  message: string;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className={MODAL_BACKDROP}>
      <div role="alertdialog" aria-modal="true" className={MODAL_PANEL}>
        <p className="mb-6 font-ui text-sm text-foreground">{message}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={buttonVariants({
              variant: "destructive",
              className: "flex-1",
            })}
          >
            {pending ? "Deleting…" : "Yes"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className={buttonVariants({
              variant: "outline",
              className: "flex-1",
            })}
          >
            No
          </button>
        </div>
      </div>
    </div>
  );
}
