import type { ReactNode } from "react";
import { signout } from "~/app/auth/actions";
import { buttonVariants } from "~/components/ui/button";

const VARIANT_CLASSES = {
  nav: buttonVariants({ variant: "outline", size: "sm" }),
  card: "w-full rounded-2xl border border-destructive/30 bg-card p-4 text-center font-ui text-sm text-destructive shadow-sm transition-colors hover:bg-destructive/10",
};

export function SignOutButton({
  variant,
  children,
}: {
  variant: keyof typeof VARIANT_CLASSES;
  children: ReactNode;
}) {
  return (
    <form action={signout}>
      <button type="submit" className={VARIANT_CLASSES[variant]}>
        {children}
      </button>
    </form>
  );
}
