import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { env } from "~/env";
import { createStripeClient } from "~/lib/stripe/server";
import { createAdminClient } from "~/lib/supabase/admin";

async function upsertSubscription(
  admin: ReturnType<typeof createAdminClient>,
  subscription: Stripe.Subscription,
  fallbackUserId?: string | null,
) {
  const userId = subscription.metadata.user_id ?? fallbackUserId;
  if (!userId) {
    console.error(
      "Stripe subscription has no user_id metadata:",
      subscription.id,
    );
    return;
  }

  const item = subscription.items.data[0];
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      current_period_start: item
        ? new Date(item.current_period_start * 1000).toISOString()
        : null,
      current_period_end: item
        ? new Date(item.current_period_end * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = createStripeClient();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (typeof session.subscription === "string") {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription,
        );
        await upsertSubscription(
          admin,
          subscription,
          session.metadata?.user_id ?? session.client_reference_id,
        );
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await upsertSubscription(admin, event.data.object);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
