import { env } from "~/env";
import { extractFirstImageUrl, stripHtml } from "~/lib/email/html";
import type { FullEmail } from "~/lib/google/gmail-app-password";

export const MOCK_GMAIL_ENABLED =
  env.MOCK_GMAIL === "true" && env.NODE_ENV !== "production";

/** A test email plus a plain-language note of what the scan should do. */
export type MockEmail = FullEmail & { expected: string };

// Real receipts wrap photos and product names in long click-tracking links;
// these mimic that so the AI trimming has something realistic to shorten.
function track(id: string): string {
  return `https://click.mail.example.com/ls/click?upn=${id}-${"u001.Bx7Kq9".repeat(20)}`;
}

function photo(src: string): string {
  return `<img src="https://cdn.example.com/images/${src}" width="120" height="120" alt="">`;
}

const TRACKING_PIXEL =
  '<img src="https://open.example.com/pixel.gif" width="1" height="1">';

function footer(store: string): string {
  return `<p>You are receiving this email because you shopped at ${store}.
<a href="${track("unsub")}">Unsubscribe</a> | <a href="${track("privacy")}">Privacy Policy</a> |
<a href="https://instagram.com/${store.toLowerCase()}">Instagram</a></p>
<p>© 2026 ${store} Inc. 100 Commerce Way, Springfield. All rights reserved.</p>${TRACKING_PIXEL}`;
}

// Mirrors how the IMAP scan turns a downloaded email into text.
function fromHtml(
  email: Omit<MockEmail, "bodyText" | "imageUrl">,
  html: string,
): MockEmail {
  return {
    ...email,
    bodyText: stripHtml(html),
    imageUrl: extractFirstImageUrl(html),
  };
}

function fromText(
  email: Omit<MockEmail, "bodyText" | "imageUrl">,
  text: string,
): MockEmail {
  return { ...email, bodyText: text, imageUrl: null };
}

// `uid` sets the order emails arrived in: the dedupe keeps the earliest email
// for each order. Where the scan categories change the outcome, `expected`
// covers both a user with none and one who picked Clothing, Beauty and
// Accessories ("C/B/A").
export const MOCK_EMAILS: MockEmail[] = [
  fromHtml(
    {
      id: "mock-amazon-order-confirmed",
      uid: 1,
      from: "auto-confirm@amazon.com",
      subject: "Your Amazon.com order #112-1234567-1234567",
      expected:
        "No scan categories: kept, 2 items: LED Desk Lamp, quantity 2 at $34.99, and Extra Large Mouse Pad at $12.99, each with its own photo and link. C/B/A: no Clothing/Beauty/Accessories item words, so it goes to the category content check, which should drop it (nothing in it fits).",
    },
    `<p><a href="${track("browser")}">View in browser</a></p>
<p>Hello, thanks for your order!</p>
<p>Order #112-1234567-1234567</p>
<table>
<tr><td><a href="${track("lamp-img")}">${photo("desk-lamp.jpg")}</a></td>
<td><a href="${track("lamp-name")}">LED Desk Lamp with USB Charging Port</a><br>Qty: 2<br>$34.99</td></tr>
<tr><td><a href="${track("pad-img")}">${photo("mouse-pad.jpg")}</a></td>
<td><a href="${track("pad-name")}">Extra Large Mouse Pad</a><br>Qty: 1<br>$12.99</td></tr>
</table>
<p>Item(s) Subtotal: $82.97<br>Shipping: $0.00<br>Order Total: $82.97</p>
${footer("Amazon")}`,
  ),
  fromHtml(
    {
      id: "mock-amazon-order-shipped",
      uid: 6,
      from: "auto-confirm@amazon.com",
      subject: "Your Amazon.com order #112-1234567-1234567 has shipped",
      expected:
        "Dropped by Remove duplicates: same sender and order number as the earlier order confirmation.",
    },
    `<p>Your package is on its way!</p>
<p>Order #112-1234567-1234567</p>
<p><a href="${track("lamp-name")}">LED Desk Lamp with USB Charging Port</a> Qty: 2 $34.99</p>
<p><a href="${track("pad-name")}">Extra Large Mouse Pad</a> Qty: 1 $12.99</p>
<p><a href="${track("track-package")}">Track package</a></p>
${footer("Amazon")}`,
  ),
  fromHtml(
    {
      id: "mock-sephora-order",
      uid: 2,
      from: "orders@sephora.com",
      subject: "Your Sephora order confirmation",
      expected:
        "Kept. 1 item: Vitamin C Brightening Serum at $53.00 ($68.00 minus the $15.00 discount), with its photo. C/B/A: 'serum' is a Beauty item word, so it skips the content check; category Skincare.",
    },
    `<p>Thank you for your order!</p>
<p><a href="${track("serum-img")}">${photo("vitamin-c-serum.jpg")}</a>
<a href="${track("serum-name")}">Vitamin C Brightening Serum (1 oz)</a> $68.00</p>
<p>Merchandise Total: $68.00<br>Discount: -$15.00<br>Shipping: $5.95<br>Tax: $4.65<br>Order Total: $63.60</p>
${footer("Sephora")}`,
  ),
  fromHtml(
    {
      id: "mock-glossier-order",
      uid: 3,
      from: "hello@glossier.com",
      subject: "Order confirmed: thanks for shopping Glossier",
      expected:
        "Kept. 3 items, each matched to its own photo: Balm Dotcom $16.00, Boy Brow $20.00, Cloud Paint quantity 2 at $22.00. C/B/A: 'balm' and 'brow' are Beauty item words, so it skips the content check; categories from Makeup/Skincare.",
    },
    `<p><a href="${track("browser")}">View this email in your browser</a></p>
<h1>We got your order</h1>
<table>
<tr><td><a href="${track("balm-img")}">${photo("balm-dotcom.png")}</a></td><td><a href="${track("balm-name")}">Balm Dotcom</a></td><td>1 × $16.00</td><td>$16.00</td></tr>
<tr><td><a href="${track("brow-img")}">${photo("boy-brow.png")}</a></td><td><a href="${track("brow-name")}">Boy Brow</a></td><td>1 × $20.00</td><td>$20.00</td></tr>
<tr><td><a href="${track("cloud-img")}">${photo("cloud-paint.png")}</a></td><td><a href="${track("cloud-name")}">Cloud Paint</a></td><td>2 × $22.00</td><td>$44.00</td></tr>
</table>
<p>Subtotal $80.00 · Shipping $0.00 · Tax $6.40 · Total $86.40</p>
${footer("Glossier")}`,
  ),
  fromHtml(
    {
      id: "mock-mug-order-unsubscribe-on-top",
      uid: 4,
      from: "hello@mugshop.example.com",
      subject: "Order confirmed: Ceramic Mug Set",
      expected:
        'No scan categories: kept, 1 item: Ceramic Mug Set (4 pack) at $38.00. "Unsubscribe" appears at the top, so this checks that the footer cut doesn\'t remove the order details below it. C/B/A: no item words for those categories, so it should be dropped by the content check (a mug is Home).',
    },
    `<p style="font-size:10px"><a href="${track("unsub-top")}">Unsubscribe</a> from marketing emails</p>
<p>Thanks for your order!</p>
<p><a href="${track("mug-img")}">${photo("mug-set.jpg")}</a> <a href="${track("mug-name")}">Ceramic Mug Set (4 pack)</a> $38.00</p>
<p>Shipping $6.00 · Total $44.00</p>
${footer("MugShop")}`,
  ),
  fromText(
    {
      id: "mock-uber-receipt",
      uid: 5,
      from: "noreply@uber.com",
      subject: "Thanks for riding, here's your Tuesday morning trip receipt",
      expected:
        "No scan categories: kept, 1 item in Transportation: the ride at $18.42, with no photo. C/B/A: no item words, so it should be dropped by the content check. Transportation: 'ride' is a Transportation item word, so it skips the content check; category Rideshare. Food only: should be dropped by the content check.",
    },
    `Thanks for riding with Uber

Total: $18.42
Trip fare, Tuesday 8:14 AM
Pickup: 5th Ave & Main St
Drop-off: 123 Market St

Manage your trips: https://riders.uber.com/trips

We hope you enjoyed your ride!`,
  ),
  fromText(
    {
      id: "mock-streamflix-renewal",
      uid: 7,
      from: "billing@streamflix.example.com",
      subject: "Your StreamFlix subscription has renewed",
      expected:
        "No scan categories: kept, 1 item in Subscriptions: StreamFlix Premium at $22.99. C/B/A: no item words, so it should be dropped by the content check.",
    },
    `Hi there,

Your monthly StreamFlix Premium subscription has renewed.

Plan: Premium (4K, 4 screens)
Amount charged: $22.99
Next billing date: next month

Thanks for being a subscriber!`,
  ),
  fromText(
    {
      id: "mock-marketing-sale",
      uid: 8,
      from: "deals@somestore.example.com",
      subject: "50% OFF your next order - today only!",
      expected: "Dropped by the subject noise filter (reads as a sale).",
    },
    "Don't miss out! Everything is 50% off today only. Shop now before it's gone. Prices from $9.99.",
  ),
  fromHtml(
    {
      id: "mock-style-picks",
      uid: 9,
      from: "style@somestore.example.com",
      subject: "Your weekly style picks are here",
      expected:
        "Should be dropped by Jev (recommendations, not a purchase). The subject regex doesn't catch it. If Jev keeps it with C/B/A, 'jacket' and 'boots' match Clothing item words, so it skips the content check; Claude should still record no items.",
    },
    `<h1>Picked for you this week</h1>
<p><a href="${track("jacket-img")}">${photo("denim-jacket.jpg")}</a> <a href="${track("jacket")}">Classic Denim Jacket</a> $89.00</p>
<p><a href="${track("boots-img")}">${photo("ankle-boots.jpg")}</a> <a href="${track("boots")}">Leather Ankle Boots</a> $140.00</p>
${footer("SomeStore")}`,
  ),
  fromText(
    {
      id: "mock-package-delivered",
      uid: 10,
      from: "shipping@parcels.example.com",
      subject: "Your package was delivered",
      expected:
        "Dropped by the body price filter: the email mentions no price.",
    },
    `Good news! Your package was delivered today at 2:41 PM.

It was left at your front door.

Questions? Visit our help center.`,
  ),
  fromHtml(
    {
      id: "mock-amazon-mixed-order",
      uid: 11,
      from: "auto-confirm@amazon.com",
      subject: "Your Amazon.com order #112-7654321-7654321",
      expected:
        "No scan categories: kept, 2 items: Women's Ribbed Knit Top at $24.99 and USB-C Fast Charger at $19.99. C/B/A: 'top' is too vague to be an item word, so it goes to the content check, which should keep it because of the top; Claude records only the top (category Tops) and skips the charger.",
    },
    `<p>Hello, thanks for your order!</p>
<p>Order #112-7654321-7654321</p>
<table>
<tr><td><a href="${track("top-img")}">${photo("ribbed-top.jpg")}</a></td>
<td><a href="${track("top-name")}">Women's Ribbed Knit Top, Black, Size M</a><br>Qty: 1<br>$24.99</td></tr>
<tr><td><a href="${track("charger-img")}">${photo("usb-c-charger.jpg")}</a></td>
<td><a href="${track("charger-name")}">USB-C Fast Charger 30W</a><br>Qty: 1<br>$19.99</td></tr>
</table>
<p>Item(s) Subtotal: $44.98<br>Shipping: $0.00<br>Order Total: $44.98</p>
${footer("Amazon")}`,
  ),
  fromText(
    {
      id: "mock-uber-eats-order",
      uid: 13,
      from: "uber.us@uber.com",
      subject: "Your Uber Eats order with Sweetgreen",
      expected:
        "No scan categories: kept, 1 item in Food: the Sweetgreen order at $16.85. C/B/A: no item words, so it should be dropped by the content check. Food: 'Uber Eats' is a Food item word, so it skips the content check; one Food Delivery item. Transportation only: should be dropped by the content check.",
    },
    `Thanks for ordering, here's your receipt

Sweetgreen
1x Harvest Bowl $14.35
Delivery fee $2.50

Total: $16.85
Delivered Wednesday 12:31 PM`,
  ),
  fromText(
    {
      id: "mock-bestbuy-order",
      uid: 12,
      from: "BestBuyInfo@emailinfo.bestbuy.com",
      subject: "Thanks for your order, BBY01-806912345678",
      expected:
        "No scan categories: kept, 1 item: Wireless Earbuds at $129.99. C/B/A: no item words for those categories, so it should be dropped by the content check (earbuds are Electronics).",
    },
    `Thanks for shopping with us!

Order number: BBY01-806912345678

Wireless Noise Cancelling Earbuds
Qty: 1
$129.99

Subtotal: $129.99
Tax: $10.40
Total: $140.39`,
  ),
];
