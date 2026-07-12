"use client";

import Link from "next/link";
import { useState } from "react";
import { login } from "~/app/auth/actions";
import { GoogleSignInButton } from "~/components/google-sign-in-button";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

const EMAIL_LIMIT = 40;
const PASSWORD_LIMIT = 40;

export function LoginForm({ error }: { error?: string }) {
  const [emailLength, setEmailLength] = useState(0);
  const [passwordLength, setPasswordLength] = useState(0);

  return (
    <>
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <form action={login} className="space-y-4">
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
            autoComplete="current-password"
            onChange={(e) => setPasswordLength(e.target.value.length)}
          />
          {passwordLength >= PASSWORD_LIMIT && (
            <p className="text-xs text-destructive">
              The {PASSWORD_LIMIT} character limit has been reached.
            </p>
          )}
        </div>
        <Button type="submit" className="w-full">
          Sign in
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or</span>
        </div>
      </div>

      <GoogleSignInButton />

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/auth/signup"
          className="text-foreground underline-offset-4 hover:underline"
        >
          Sign up
        </Link>
      </p>
    </>
  );
}
