import type { SupabaseClient, User } from "@supabase/supabase-js";

// Never surface the raw app password in the UI - just enough of it (last 4
// chars) to confirm which credential is connected without the full secret
// sitting in an admin page (browser history, screenshots, etc.)
export function maskAppPassword(password: string): string {
  const last4 = password.slice(-4);
  return `${"•".repeat(Math.max(password.length - 4, 4))}${last4}`;
}

export function formatJoinDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const USERS_PER_PAGE = 1000;

/** listUsers() is paginated (50 per page by default) - fetch every page. */
export async function listAllUsers(supabase: SupabaseClient): Promise<User[]> {
  const users: User[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: USERS_PER_PAGE,
    });
    if (error) {
      console.error("Admin page failed to list users:", error);
      return users;
    }
    users.push(...data.users);
    if (data.users.length < USERS_PER_PAGE) return users;
  }
}
