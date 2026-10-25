import type { User } from "@supabase/supabase-js";
import { env } from "~/env";

// While the app is gated behind a waitlist, only these accounts may sign in
// and use anything beyond the landing page. Server-only: never import this
// from a client component, or the addresses end up in the browser bundle.
const EARLY_ACCESS_EMAILS = [
  "shany.armellini@gmail.com",
  "debbie.armellini@gmail.com",
];

export const WAITLIST_ERROR =
  "This email doesn't have early access yet. Join the waitlist on the home page.";

/** A signed-in user with a confirmed email on the early-access list. */
function hasEarlyAccess(user: User | null): boolean {
  const email = user?.email?.toLowerCase();
  return (
    !!email && !!user?.email_confirmed_at && EARLY_ACCESS_EMAILS.includes(email)
  );
}

/**
 * Whether the waitlist keeps this user out. Local dev skips the gate so any
 * account you sign up with locally can test end-to-end flows. NODE_ENV is
 * only ever not "production" for `next dev`, never for a deployed app.
 */
export function isBlockedByWaitlist(user: User | null): boolean {
  return env.NODE_ENV === "production" && !hasEarlyAccess(user);
}
