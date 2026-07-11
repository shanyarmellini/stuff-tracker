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

  return (
    <nav className="border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-6 px-4">
        <Link href="/" className="font-semibold tracking-tight">
          Stuff Tracker
        </Link>
        <div className="flex flex-1 gap-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm transition-colors hover:text-foreground",
                pathname === link.href
                  ? "text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
          {user?.app_metadata?.role === "admin" && (
            <Link
              href="/admin"
              className={cn(
                "text-sm transition-colors hover:text-foreground",
                pathname === "/admin"
                  ? "text-foreground"
                  : "text-muted-foreground",
              )}
            >
              Admin
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <form action={signout}>
              <Button type="submit" variant="outline" size="sm">
                Sign out
              </Button>
            </form>
          ) : (
            <>
              <Button
                asChild
                variant={pathname === "/auth/login" ? "default" : "ghost"}
                size="sm"
                className={
                  pathname !== "/auth/login" ? "border border-border" : ""
                }
              >
                <Link href="/auth/login">Sign in</Link>
              </Button>
              <Button
                asChild
                variant={pathname === "/auth/signup" ? "default" : "ghost"}
                size="sm"
                className={
                  pathname !== "/auth/signup" ? "border border-border" : ""
                }
              >
                <Link href="/auth/signup">Sign up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
