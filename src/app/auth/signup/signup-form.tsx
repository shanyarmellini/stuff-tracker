"use client";

import Link from "next/link";
import { useState } from "react";
import { signup } from "~/app/auth/actions";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

const EMAIL_LIMIT = 40;
const PASSWORD_LIMIT = 40;

export function SignupForm({ error }: { error?: string }) {
  const [emailLength, setEmailLength] = useState(0);
  const [passwordLength, setPasswordLength] = useState(0);

  return (
    <>
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <form action={signup} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            maxLength={EMAIL_LIMIT}
            autoComplete="email"
            onChange={(e) => setEmailLength(e.target.value.length)}
          />
          {emailLength >= EMAIL_LIMIT && (
            <p className="text-xs text-destructive">
              The {EMAIL_LIMIT} character limit has been reached.
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            maxLength={PASSWORD_LIMIT}
            autoComplete="new-password"
            onChange={(e) => setPasswordLength(e.target.value.length)}
          />
          {passwordLength >= PASSWORD_LIMIT && (
            <p className="text-xs text-destructive">
              The {PASSWORD_LIMIT} character limit has been reached.
            </p>
          )}
        </div>
        <Button type="submit" className="w-full">
          Create account
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/auth/login"
          className="text-foreground underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
