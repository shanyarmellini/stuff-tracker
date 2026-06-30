"use server";

import { redirect } from "next/navigation";
import { createClient } from "~/lib/supabase/server";

export async function saveOnboarding(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/signup");

  const itemTypes = formData.getAll("item_types") as string[];
  const gender = formData.get("gender") as string | null;
  const age = formData.get("age") ? Number(formData.get("age")) : null;

  await supabase.from("profiles").upsert({
    user_id: user.id,
    item_types: itemTypes,
    gender: gender || null,
    age,
    onboarding_complete: true,
  });

  redirect("/dashboard");
}
