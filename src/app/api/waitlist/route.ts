import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "~/lib/api";
import { createClient } from "~/lib/supabase/server";

const UNIQUE_VIOLATION = "23505";

const bodySchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().toLowerCase().email(),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Enter a valid email address.", 400);

  const supabase = await createClient();
  const { error } = await supabase.from("waitlist").insert(parsed.data);

  // Already on the list counts as success.
  if (error && error.code !== UNIQUE_VIOLATION) {
    console.error("Failed to add email to waitlist:", error.message);
    return jsonError("Something went wrong. Please try again.", 500);
  }
  return NextResponse.json({ ok: true });
}
