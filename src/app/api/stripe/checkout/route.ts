import { NextResponse } from "next/server";
import { env } from "~/env";
import { getPostHogClient } from "~/lib/posthog-server";
import { createStripeClient } from "~/lib/stripe/server";
import { createClient } from "~/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const origin = new URL(request.url).origin;
  const stripe = createStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
    customer: subscription?.stripe_customer_id ?? undefined,
    customer_email: subscription?.stripe_customer_id ? undefined : user.email,
    client_reference_id: user.id,
    metadata: { user_id: user.id },
    subscription_data: { metadata: { user_id: user.id } },
    success_url: `${origin}/dashboard/account?checkout=success`,
    cancel_url: `${origin}/dashboard/account?checkout=cancelled`,
  });

  if (!session.url) {
    return NextResponse.json(
      { error: "Failed to start checkout." },
      { status: 500 },
    );
  }

  const posthog = getPostHogClient();
  posthog.capture({
    distinctId: user.id,
    event: "checkout_started",
    properties: { stripe_session_id: session.id },
  });
  await posthog.flush();

  return NextResponse.json({ url: session.url });
}
