import { NextResponse } from "next/server";
import { createStripeClient } from "~/lib/stripe/server";
import { createClient } from "~/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!subscription?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No billing account found. Subscribe first." },
      { status: 400 },
    );
  }

  const origin = new URL(request.url).origin;
  const stripe = createStripeClient();

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${origin}/dashboard/account`,
  });

  return NextResponse.json({ url: session.url });
}
