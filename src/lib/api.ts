import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { isAdmin } from "~/lib/auth";
import { getCurrentUser } from "~/lib/supabase/server";

type AuthedRequest = {
  supabase: Awaited<ReturnType<typeof getCurrentUser>>["supabase"];
  user: User;
};

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** Returns the signed-in user, or a 401 response for the route to return. */
export async function requireUser(): Promise<AuthedRequest | NextResponse> {
  const { supabase, user } = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);
  return { supabase, user };
}

/** Like requireUser, but also returns 403 for signed-in non-admins. */
export async function requireAdmin(): Promise<AuthedRequest | NextResponse> {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  if (!isAdmin(auth.user)) return jsonError("Forbidden", 403);
  return auth;
}
