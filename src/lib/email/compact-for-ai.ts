import { PRICE_PATTERN } from "~/lib/email/price";

/**
 * An email's text trimmed for the AI extraction prompt, plus the lookup
 * tables that turn the AI's `[photo N]` / `[link N]` answers back into URLs.
 * `photos[N - 1]` is the URL for `[photo N]`, `links[N - 1]` for `[link N]`.
 */
export type CompactedEmail = {
  text: string;
  photos: string[];
  links: string[];
};

// stripHtml (~/lib/email/html) renders product images as "[photo: URL]" and
// links as "label (URL)" or a bare URL when the link has no text.
const PHOTO_MARKER = /\[photo: ([^\]\s]+)\]/g;
const LABELED_LINK = /\(((?:https?|mailto|tel):[^\s)]+)\)/gi;
const BARE_URL = /\bhttps?:\/\/[^\s)<>\]]+/gi;

// Links that never point at a product: matched on the URL itself, or on the
// link's label (the text right before it).
const NON_PRODUCT_URL =
  /^(mailto|tel):|unsubscribe|opt-?out|privacy|\/terms|preferences|facebook\.com|instagram\.com|twitter\.com|\/\/(www\.)?x\.com|tiktok\.com|pinterest\.|youtube\.com|linkedin\.com|apps\.apple\.com|play\.google\.com/i;
const NON_PRODUCT_LABEL =
  /(unsubscribe|privacy( policy)?|terms( of (use|service))?|(email )?preferences|view (it |this email )?(in (your )?browser|online|as a web ?page)|facebook|instagram|twitter|tiktok|pinterest|youtube|linkedin|app store|google play)\s*$/i;

// Footer boilerplate. Only cut at a marker that comes after the last price,
// so an order summary printed below an early "Unsubscribe" is never lost.
const FOOTER_MARKER =
  /unsubscribe|privacy policy|all rights reserved|©|\(c\) ?\d{4}|manage (your )?(email )?preferences|you('re| are) receiving this/gi;

function numberer(list: string[]) {
  return (url: string) => {
    const existing = list.indexOf(url);
    if (existing !== -1) return existing + 1;
    list.push(url);
    return list.length;
  };
}

function labelBefore(text: string, offset: number): string {
  const start = Math.max(
    text.lastIndexOf(")", offset - 1),
    text.lastIndexOf("]", offset - 1),
    offset - 60,
  );
  return text.slice(start + 1, offset);
}

function cutFooter(text: string): string {
  const prices = [...text.matchAll(new RegExp(PRICE_PATTERN.source, "gi"))];
  const last = prices.at(-1);
  const afterLastPrice = last ? (last.index ?? 0) + last[0].length : 0;
  for (const marker of text.matchAll(FOOTER_MARKER)) {
    if ((marker.index ?? 0) >= afterLastPrice) {
      return text.slice(0, marker.index).trimEnd();
    }
  }
  return text;
}

/**
 * Shrinks email text before it is sent to the AI, without touching product
 * text: every photo and link URL becomes a short numbered marker, links that
 * never point at a product (unsubscribe, privacy, social, app stores) are
 * removed, and footer boilerplate after the last price is cut.
 */
export function compactEmailForAi(bodyText: string): CompactedEmail {
  const photos: string[] = [];
  const links: string[] = [];
  const photoNumber = numberer(photos);
  const linkNumber = numberer(links);

  const text = bodyText
    .replace(
      PHOTO_MARKER,
      (_match, url: string) => `[photo ${photoNumber(url)}]`,
    )
    .replace(
      LABELED_LINK,
      (_match, url: string, offset: number, whole: string) =>
        NON_PRODUCT_URL.test(url) ||
        NON_PRODUCT_LABEL.test(labelBefore(whole, offset))
          ? ""
          : `[link ${linkNumber(url)}]`,
    )
    .replace(BARE_URL, (url) =>
      NON_PRODUCT_URL.test(url) ? "" : `[link ${linkNumber(url)}]`,
    )
    .replace(/[ \t]+/g, " ");

  return { text: cutFooter(text).trim(), photos, links };
}
