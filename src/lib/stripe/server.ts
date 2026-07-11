import Stripe from "stripe";
import { env } from "~/env";

export function createStripeClient() {
  return new Stripe(env.STRIPE_SECRET_KEY);
}
