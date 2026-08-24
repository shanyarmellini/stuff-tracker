import type { PurchaseCandidateEmail } from "~/lib/google/gmail-app-password";

/**
 * Canned purchase emails used when MOCK_GMAIL=true, in place of a real IMAP
 * scan. Deliberately covers the edge cases the extraction prompt already
 * handles (a pre-discount price, multiple items in one order, an explicit
 * quantity, a recurring subscription, a non-product transportation charge)
 * so this mode is useful for testing extraction quality, not just plumbing.
 */
export const MOCK_CANDIDATE_EMAILS: PurchaseCandidateEmail[] = [
  {
    id: "mock-amazon-order-1",
    from: "auto-confirm@amazon.com",
    subject: "Your Amazon.com order has shipped",
    bodyText: `Hello,

Your package is on its way!

Order #: 112-1234567-1234567

[photo: https://example.com/images/desk-lamp.jpg]
LED Desk Lamp with USB Charging Port
Qty: 2
Item Price: $34.99

[photo: https://example.com/images/mouse-pad.jpg]
Extra Large Mouse Pad
Qty: 1
Item Price: $12.99

Order Summary
Item(s) Subtotal: $82.97
Shipping: $0.00
Total: $82.97

Thanks for shopping with us!`,
    imageUrl: "https://example.com/images/desk-lamp.jpg",
  },
  {
    id: "mock-sephora-order-1",
    from: "orders@sephora.com",
    subject: "Your Sephora order confirmation",
    bodyText: `Thank you for your order!

[photo: https://example.com/images/serum.jpg]
Vitamin C Brightening Serum (1 oz) (https://sephora.com/product/vitamin-c-serum)

Item Price: $68.00

Order Summary
Merchandise Total: $68.00
Discount: $15.00
Shipping: $5.95
Tax: $4.65
Order Total: $63.60

Enjoy your new products!`,
    imageUrl: "https://example.com/images/serum.jpg",
  },
  {
    id: "mock-uber-receipt-1",
    from: "receipts@uber.com",
    subject: "Thanks for riding, here's your Tuesday morning trip receipt",
    bodyText: `Thanks for riding with Uber

Total: $18.42
Trip fare, Tuesday 8:14 AM
Pickup: 5th Ave & Main St
Drop-off: 123 Market St

We hope you enjoyed your ride!`,
    imageUrl: null,
  },
  {
    id: "mock-subscription-renewal-1",
    from: "billing@streamflix.example.com",
    subject: "Your StreamFlix subscription has renewed",
    bodyText: `Hi there,

Your monthly StreamFlix Premium subscription has renewed.

Plan: Premium (4K, 4 screens)
Amount charged: $22.99
Next billing date: next month

Thanks for being a subscriber!`,
    imageUrl: null,
  },
  {
    id: "mock-marketing-noise-1",
    from: "deals@somestore.example.com",
    subject: "50% OFF your next order - today only!",
    bodyText: `Don't miss out! Everything is 50% off today only. Shop now before it's gone.`,
    imageUrl: null,
  },
];
