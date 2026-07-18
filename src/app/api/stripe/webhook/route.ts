import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { env } from "~/env";
import { getPostHogClient } from "~/lib/posthog-server";
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
  const posthog = getPostHogClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (typeof session.subscription === "string") {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription,
        );
        const userId = session.metadata?.user_id ?? session.client_reference_id;
        await upsertSubscription(admin, subscription, userId);
        if (userId) {
          posthog.capture({
            distinctId: userId,
            event: "subscription_activated",
            properties: {
              stripe_subscription_id: subscription.id,
              stripe_customer_id:
                typeof subscription.customer === "string"
                  ? subscription.customer
                  : subscription.customer.id,
            },
          });
        }
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      await upsertSubscription(admin, event.data.object);
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      await upsertSubscription(admin, subscription);
      const userId = subscription.metadata.user_id;
      if (userId) {
        posthog.capture({
          distinctId: userId,
          event: "subscription_cancelled",
          properties: { stripe_subscription_id: subscription.id },
        });
      }
      break;
    }
    default:
      break;
  }

  await posthog.flush();

  return NextResponse.json({ received: true });
}
