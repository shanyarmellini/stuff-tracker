"use client";

import Link from "next/link";
import { useState } from "react";
import { GoogleSignInButton } from "~/components/google-sign-in-button";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

// RFC 5321 caps an email address at 254 characters; bcrypt (used by Supabase
// Auth) only looks at the first 72 bytes of a password.
const EMAIL_LIMIT = 254;
const PASSWORD_LIMIT = 72;

export type AuthFormConfig = {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  passwordAutoComplete: "current-password" | "new-password";
  switchPrompt: string;
  switchHref: string;
  switchLabel: string;
};

function LimitedInput({
  id,
  label,
  limit,
  ...props
}: React.ComponentProps<typeof Input> & {
  id: string;
  label: string;
  limit: number;
}) {
  const [length, setLength] = useState(0);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        required
        maxLength={limit}
        onChange={(e) => setLength(e.target.value.length)}
        {...props}
      />
      {length >= limit && (
        <p className="text-xs text-destructive">
          The {limit} character limit has been reached.
        </p>
      )}
    </div>
  );
}

export function AuthForm({
  config,
  error,
  message,
}: {
  config: AuthFormConfig;
  error?: string;
  message?: string;
}) {
  return (
    <>
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-md bg-muted px-3 py-2 text-sm text-foreground">
          {message}
        </p>
      )}

      <form action={config.action} className="space-y-4">
        <LimitedInput
          id="email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          limit={EMAIL_LIMIT}
        />
        <LimitedInput
          id="password"
          label="Password"
          type="password"
          autoComplete={config.passwordAutoComplete}
          limit={PASSWORD_LIMIT}
        />
        <Button type="submit" className="w-full">
          {config.submitLabel}
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
        {config.switchPrompt}{" "}
        <Link
          href={config.switchHref}
          className="text-foreground underline-offset-4 hover:underline"
        >
          {config.switchLabel}
        </Link>
      </p>
    </>
  );
}
