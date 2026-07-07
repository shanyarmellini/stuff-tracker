import Link from "next/link";
import { createClient } from "~/lib/supabase/server";
import { cn } from "~/lib/utils";
import { SignupCta } from "./signup-cta";

function Confetti({
  className,
  colorClassName,
}: {
  className: string;
  colorClassName: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 60 200"
      className={cn("absolute", className, colorClassName)}
    >
      <path
        d="M30,5 C15,35 45,55 20,80 C-5,105 45,120 25,150 C15,165 40,180 30,195"
        fill="none"
        stroke="currentColor"
        strokeWidth="16"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="relative flex min-h-[calc(100vh-3.5rem)] items-center justify-center overflow-hidden bg-sky-50 p-4 sm:p-8">
      {/* Top-left: yellow zigzag */}
      <Confetti
        className="-top-8 -left-10 h-40 w-16 -rotate-[75deg] sm:h-52 sm:w-20"
        colorClassName="text-amber-400"
      />
      {/* Top-right: orange zigzag */}
      <Confetti
        className="-top-10 -right-10 h-40 w-16 rotate-[105deg] sm:h-52 sm:w-20"
        colorClassName="text-orange-400"
      />
      {/* Right-middle: purple zigzag */}
      <Confetti
        className="top-1/3 -right-10 h-40 w-16 sm:h-56 sm:w-20"
        colorClassName="text-violet-400"
      />
      {/* Left-middle: green zigzag */}
      <Confetti
        className="top-1/4 -left-8 h-36 w-16 rotate-[8deg] sm:h-48 sm:w-20"
        colorClassName="text-emerald-400"
      />
      {/* Bottom-left: blue zigzag */}
      <Confetti
        className="-bottom-8 -left-10 h-40 w-16 rotate-[15deg] sm:h-52 sm:w-20"
        colorClassName="text-sky-500"
      />
      {/* Bottom-right: pink zigzag */}
      <Confetti
        className="-bottom-10 -right-10 h-40 w-16 rotate-[165deg] sm:h-52 sm:w-20"
        colorClassName="text-rose-400"
      />

      <div className="relative z-10 flex max-w-2xl flex-col items-center gap-6 px-6 py-16 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-4 py-1 font-ui text-xs font-medium text-sky-600">
          📬 Scans your inbox, automatically
        </span>
        <h1 className="max-w-2xl font-display text-4xl leading-tight tracking-wide text-slate-800 sm:text-6xl">
          Online inventory created by AI in seconds
        </h1>
        <p className="max-w-md font-ui text-base text-slate-500 sm:text-lg">
          Stuff Tracker reads your order confirmations and lets AI build a
          living inventory of everything you&apos;ve bought — so you always know
          what&apos;s already yours before you buy it again.
        </p>
        <SignupCta isSignedIn={!!user} />
        <p className="font-ui text-sm text-slate-400">
          Already tracking your stuff?{" "}
          <Link
            href="/auth/login"
            className="text-slate-600 underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
