"use server";

import { redirect } from "next/navigation";
import { getPostHogClient } from "~/lib/posthog-server";
import { createClient } from "~/lib/supabase/server";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (error) {
    redirect(`/auth/login?error=${encodeURIComponent(error.message)}`);
  }

  if (data.user) {
    const posthog = getPostHogClient();
    posthog.identify({
      distinctId: data.user.id,
      properties: { email: data.user.email },
    });
    posthog.capture({
      distinctId: data.user.id,
      event: "user_logged_in",
      properties: { method: "email" },
    });
    await posthog.flush();
  }

  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (error) {
    redirect(`/auth/signup?error=${encodeURIComponent(error.message)}`);
  }

  if (data.user) {
    const posthog = getPostHogClient();
    posthog.identify({
      distinctId: data.user.id,
      properties: { email: data.user.email },
    });
    posthog.capture({
      distinctId: data.user.id,
      event: "user_signed_up",
      properties: { method: "email" },
    });
    await posthog.flush();
  }

  redirect("/dashboard");
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
