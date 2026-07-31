"use client";

import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signout } from "~/app/auth/actions";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

const links = [
  { href: "/dashboard", label: "Home" },
  { href: "/subscriptions", label: "Subscriptions" },
];

export function Navbar({ user }: { user: User | null }) {
  const pathname = usePathname();
  const isAdmin = user?.app_metadata?.role === "admin";

  return (
    <nav className="border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 overflow-x-auto px-4 sm:gap-6">
        <Link
          href="/"
          className="shrink-0 whitespace-nowrap font-semibold tracking-tight"
        >
          Stuff Tracker
        </Link>
        {isAdmin && (
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
            <Link
              href="/admin"
              className={cn(
                "text-sm whitespace-nowrap transition-colors hover:text-foreground",
                pathname === "/admin"
                  ? "text-foreground"
                  : "text-muted-foreground",
              )}
            >
              Admin
            </Link>
          </div>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {isAdmin && (
            <form action={signout}>
              <Button type="submit" variant="outline" size="sm">
                Sign out
              </Button>
            </form>
          )}
        </div>
      </div>
    </nav>
  );
}
