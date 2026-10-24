import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";
import { isAdmin } from "~/lib/auth";

// While the app is gated behind a waitlist, only the admin account (me) may
// use anything beyond the landing page. Everyone else is bounced to "/".
const PUBLIC_PATHS = ["/", "/api/waitlist"];
const ADMIN_AUTH_PATHS = ["/auth/login", "/auth/callback"];

function matchesAny(pathname: string, paths: string[]) {
  return paths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Refresh the auth token
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (matchesAny(pathname, PUBLIC_PATHS)) {
    return response;
  }

  // Local dev only: skip the admin-only gate so any account you sign up with
  // locally can reach the dashboard/onboarding to test end-to-end flows
  // (e.g. Gmail app password scanning). NODE_ENV is only ever not
  // "production" for `next dev`, never for a built/deployed app.
  if (env.NODE_ENV !== "production") {
    return response;
  }

  if (isAdmin(user) || matchesAny(pathname, ADMIN_AUTH_PATHS)) {
    return response;
  }

  return NextResponse.redirect(new URL("/", request.url));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
