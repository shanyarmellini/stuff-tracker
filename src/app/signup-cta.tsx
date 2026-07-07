"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "~/components/ui/button";

export function SignupCta({ isSignedIn }: { isSignedIn: boolean }) {
  const [warn, setWarn] = useState(false);

  if (!isSignedIn) {
    return (
      <Button asChild size="lg" className="mt-2 font-ui">
        <Link href="/auth/signup">Sign up free</Link>
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        type="button"
        size="lg"
        className="mt-2 font-ui"
        onClick={() => setWarn(true)}
      >
        Sign up free
      </Button>
      {warn && (
        <p className="font-ui text-sm text-destructive">
          You&apos;re already signed in.
        </p>
      )}
    </div>
  );
}
