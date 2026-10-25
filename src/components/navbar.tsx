"use client";

import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "~/components/sign-out-button";
import { Button } from "~/components/ui/button";
import { isAdmin } from "~/lib/auth";
import { cn } from "~/lib/utils";

// While the app is waitlist-gated, nav links are only shown to early-access
// accounts, and the Admin link only to the admin.
const NAV_LINKS = [
  { href: "/dashboard", label: "Home", adminOnly: false },
  { href: "/admin", label: "Admin", adminOnly: true },
];

export function Navbar({
  user,
  hasAccess,
  isDev,
}: {
  user: User | null;
  // Past the waitlist gate; worked out on the server (see ~/lib/early-access).
  hasAccess: boolean;
  isDev: boolean;
}) {
  const pathname = usePathname();
  const links = hasAccess
    ? NAV_LINKS.filter((link) => !link.adminOnly || isAdmin(user))
    : [];

  return (
    <nav className="border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 overflow-x-auto px-4 sm:gap-6">
        <Link
          href="/"
          className="shrink-0 whitespace-nowrap font-semibold tracking-tight"
        >
          Stuff Tracker
        </Link>
        {links.length > 0 && (
          <div className="flex flex-1 items-center gap-3 sm:gap-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm whitespace-nowrap transition-colors hover:text-foreground",
                  pathname === link.href
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {isDev && pathname !== "/dashboard" && (
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          )}
          {user ? (
            <SignOutButton variant="nav">Sign out</SignOutButton>
          ) : (
            pathname !== "/auth/login" && (
              <Button asChild variant="outline" size="sm">
                <Link href="/auth/login">Sign in</Link>
              </Button>
            )
          )}
        </div>
      </div>
    </nav>
  );
}
