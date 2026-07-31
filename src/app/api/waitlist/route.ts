import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "~/lib/supabase/server";

const bodySchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().toLowerCase().email(),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("waitlist")
    .insert({ name: parsed.data.name, email: parsed.data.email });

  if (error && error.code !== "23505") {
    console.error("Failed to add email to waitlist:", error.message);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
