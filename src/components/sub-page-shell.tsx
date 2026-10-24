import Link from "next/link";
import type { ReactNode } from "react";

function BackIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}

/** Page chrome shared by the dashboard sub-pages (settings, emails, account). */
export function SubPageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-muted/40 px-8 py-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1.5 font-ui text-sm text-muted-foreground transition-colors hover:text-brand-strong"
        >
          <BackIcon />
          Back to My Items
        </Link>
        <h1 className="mb-1 font-display text-4xl tracking-wide text-foreground">
          {title}
        </h1>
        <p className="mb-6 font-ui text-sm text-subtle-foreground">
          {subtitle}
        </p>
        {children}
      </div>
    </div>
  );
}

export function LoadingText() {
  return <p className="font-ui text-sm text-subtle-foreground">Loading…</p>;
}
