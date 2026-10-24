import type { ReactNode } from "react";
import { signout } from "~/app/auth/actions";
import { DANGER_CARD_BUTTON_CLASS } from "~/components/class-names";
import { buttonVariants } from "~/components/ui/button";

const VARIANT_CLASSES = {
  nav: buttonVariants({ variant: "outline", size: "sm" }),
  card: DANGER_CARD_BUTTON_CLASS,
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
