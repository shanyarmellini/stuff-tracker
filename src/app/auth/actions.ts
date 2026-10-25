"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { isBlockedByWaitlist, WAITLIST_ERROR } from "~/lib/early-access";
import { createClient } from "~/lib/supabase/server";

const credentialsSchema = z.object({
  email: z.string().trim().min(1),
  password: z.string().min(1),
});

type AuthMode = { page: string };
const LOGIN: AuthMode = { page: "/auth/login" };
const SIGNUP: AuthMode = { page: "/auth/signup" };

function redirectWithError(page: string, message: string): never {
  redirect(`${page}?error=${encodeURIComponent(message)}`);
}

async function authenticate(formData: FormData, mode: AuthMode) {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    redirectWithError(mode.page, "Enter your email and password.");
  }

  const supabase = await createClient();
  const { data, error } =
    mode === LOGIN
      ? await supabase.auth.signInWithPassword(parsed.data)
      : await supabase.auth.signUp(parsed.data);
  if (error) redirectWithError(mode.page, error.message);

  if (mode === LOGIN && isBlockedByWaitlist(data.user)) {
    await supabase.auth.signOut();
    redirectWithError(mode.page, WAITLIST_ERROR);
  }

  if (mode === SIGNUP && !data.session) {
    // Email confirmation is required before the user can sign in.
    redirect(
      `/auth/login?message=${encodeURIComponent("Check your email to confirm your account")}`,
    );
  }
  redirect("/dashboard");
}

export async function login(formData: FormData) {
  await authenticate(formData, LOGIN);
}

export async function signup(formData: FormData) {
  await authenticate(formData, SIGNUP);
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
