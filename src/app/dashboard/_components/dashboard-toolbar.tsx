import Link from "next/link";
import { MenuIcon, SettingsIcon } from "~/components/icons";
import { cn } from "~/lib/utils";
import { PILL_BUTTON } from "../_lib/styles";

export function DashboardToolbar({
  onOpenSidebar,
  onOpenGmail,
}: {
  onOpenSidebar: () => void;
  onOpenGmail: () => void;
}) {
  return (
    <div className="flex shrink-0 flex-col gap-2 px-4 py-3 min-[400px]:flex-row min-[400px]:items-center min-[400px]:justify-between sm:px-8">
      <button
        type="button"
        onClick={onOpenSidebar}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-input bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-brand-strong md:hidden"
        aria-label="Open categories"
      >
        <MenuIcon />
      </button>
      <div className="flex flex-col items-end gap-2 min-[400px]:flex-1 min-[400px]:flex-row min-[400px]:flex-wrap min-[400px]:items-center min-[400px]:justify-end">
        <Link
          href="/dashboard/account"
          className={cn("text-center", PILL_BUTTON)}
        >
          Account
        </Link>
        <button type="button" onClick={onOpenGmail} className={PILL_BUTTON}>
          Email
        </button>
        <Link
          href="/dashboard/settings"
          className={cn(
            "flex items-center justify-center gap-1.5",
            PILL_BUTTON,
          )}
        >
          <SettingsIcon />
          Settings
        </Link>
      </div>
    </div>
  );
}
