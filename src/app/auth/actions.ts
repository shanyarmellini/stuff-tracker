"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { captureServerEvent } from "~/lib/posthog-server";
import { createClient } from "~/lib/supabase/server";

const credentialsSchema = z.object({
  email: z.string().trim().min(1),
  password: z.string().min(1),
});

type AuthMode = { page: string; event: string };
const LOGIN: AuthMode = { page: "/auth/login", event: "user_logged_in" };
const SIGNUP: AuthMode = { page: "/auth/signup", event: "user_signed_up" };

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

  if (data.user) {
    await captureServerEvent({
      distinctId: data.user.id,
      event: mode.event,
      properties: { method: "email" },
      identify: { email: data.user.email },
    });
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
