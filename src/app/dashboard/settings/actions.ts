"use server";

import { redirect } from "next/navigation";
import { ITEM_PHOTOS_BUCKET } from "~/app/dashboard/_lib/constants";
import { createAdminClient } from "~/lib/supabase/admin";
import { getCurrentUser } from "~/lib/supabase/server";

/** Tables wiped by "Delete all data"; profiles and auth (name, email) are kept. */
const USER_DATA_TABLES = [
  "items",
  "google_connections",
  "gmail_app_connections",
  "email_scan_logs",
] as const;

async function requireUserId() {
  const { user } = await getCurrentUser();
  if (!user) redirect("/auth/login");
  return user.id;
}

async function deleteItemPhotos(userId: string) {
  const storage = createAdminClient().storage.from(ITEM_PHOTOS_BUCKET);
  const { data: files } = await storage.list(userId, { limit: 1000 });
  if (!files?.length) return;
  await storage.remove(files.map((file) => `${userId}/${file.name}`));
}

export async function deleteUserData() {
  const userId = await requireUserId();
  const admin = createAdminClient();

  for (const table of USER_DATA_TABLES) {
    const { error } = await admin.from(table).delete().eq("user_id", userId);
    if (error) throw new Error(`Failed to delete ${table}: ${error.message}`);
  }
  await deleteItemPhotos(userId);
}

export async function deleteAccount() {
  const userId = await requireUserId();

  // Storage objects don't cascade, so remove photos before the user row.
  await deleteItemPhotos(userId);
  const { error } = await createAdminClient().auth.admin.deleteUser(userId);
  if (error) throw new Error(`Failed to delete account: ${error.message}`);

  const { supabase } = await getCurrentUser();
  await supabase.auth.signOut();
  redirect("/");
}
