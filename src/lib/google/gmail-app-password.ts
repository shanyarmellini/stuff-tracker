import { ImapFlow } from "imapflow";
import { extractFirstImageUrl, stripHtml } from "~/lib/email/html";
import { parseRawEmail } from "~/lib/email/mime";

const GMAIL_IMAP_HOST = "imap.gmail.com";
const GMAIL_IMAP_PORT = 993;

export type AppPasswordCheckResult =
  | { ok: true }
  | { ok: false; reason: "invalid_credentials" | "connection_failed" };

/**
 * Confirms a Gmail App Password actually works by opening (and immediately
 * closing) an IMAP session with it. This is the only reliable way to
 * validate an app password - Google never lets you check one without using it.
 */
export async function checkGmailAppPassword(
  email: string,
  appPassword: string,
): Promise<AppPasswordCheckResult> {
  const client = new ImapFlow({
    host: GMAIL_IMAP_HOST,
    port: GMAIL_IMAP_PORT,
    secure: true,
    auth: { user: email, pass: appPassword },
    logger: false,
  });

  try {
    await client.connect();
    await client.logout();
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isAuthError =
      /auth|credential|password|invalid/i.test(message) ||
      (err as { authenticationFailed?: boolean })?.authenticationFailed;
    return {
      ok: false,
      reason: isAuthError ? "invalid_credentials" : "connection_failed",
    };
  } finally {
    client.close();
  }
}

export type PurchaseCandidateEmail = {
  id: string;
  from: string;
  subject: string;
  bodyText: string;
  imageUrl: string | null;
};

// Deliberately broad - this only narrows down candidates so the AI never
// sees the whole inbox. The AI extraction step (extractPurchasesFromEmails)
// is what actually decides whether something is a genuine purchase, so a
// wider net here trades a few more irrelevant candidates for catching
// merchants that don't use the words "receipt"/"invoice"/"order" verbatim
// (e.g. TikTok Shop, ride-share receipts).
const PURCHASE_EMAIL_QUERY =
  '(receipt OR invoice OR order OR purchase OR shipped OR delivered OR "payment confirmation" OR "thank you for your" OR trip OR ride OR "thanks for riding")';

// How many of the most-recent matching messages to *consider* before
// narrowing to the caller's `limit`. The broad search above also matches a
// lot of marketing that merely contains "order"/"shipped" etc.; if we just
// took the newest `limit` UIDs (as we used to), those noise emails would
// crowd out genuine older purchases and the AI would never see them. So we
// pull a wide window of envelopes, drop the obvious marketing in code, and
// only then keep the newest `limit` survivors - reaching much further back
// into real purchase history for the same AI budget.
const ENVELOPE_SCAN_WINDOW = 400;

// Subject-level markers of promotional / lifecycle email that routinely
// slips through the purchase-keyword search (a "50% OFF your next ORDER"
// blast matches "order"; "your cart is waiting" matches nothing purchased).
// Matched against the subject only - purchase receipts frequently carry
// "unsubscribe" etc. in their footers, so matching the body would be far
// too aggressive. Kept conservative: every pattern here should be something
// a real order/receipt subject would essentially never say.
const MARKETING_SUBJECT_PATTERNS: RegExp[] = [
  /\b\d{1,3}%\s*off\b/i,
  /\b(flash |mega |huge |summer |winter |holiday )?sale\b/i,
  /\bcoupon\b|\bpromo code\b|\bdiscount code\b|\bvoucher\b/i,
  /\bnewsletter\b|\bdigest\b|\bwebinar\b/i,
  /\bunsubscribe\b/i,
  /back in stock|new arrivals?|just dropped|shop now|save up to|deal of the/i,
  /ends (tonight|soon|today|tomorrow)|last chance|limited time|don'?t miss/i,
  /we miss you|come back|(items?|something) (still )?(in|left in) your cart|abandoned cart|your cart is/i,
  /rate your|review your (recent )?(purchase|experience)|how did we do|take our survey/i,
];

function looksLikeMarketingNoise(subject: string): boolean {
  if (!subject) return false;
  return MARKETING_SUBJECT_PATTERNS.some((pattern) => pattern.test(subject));
}

function senderDomain(address: string): string {
  return address.toLowerCase().split("@")[1] ?? address.toLowerCase();
}

// Picks the newest `limit` survivors, but round-robins across sender
// domains first instead of taking a flat "most recent N". A high-volume
// sender (e.g. Amazon order emails every few days) would otherwise fill the
// entire `limit` with its own messages and squeeze out a low-frequency
// sender (e.g. a handful of Uber trip receipts spread across the year) even
// though the latter's messages are well within the same time window.
function pickFairlyAcrossSenders(
  survivors: { uid: number; domain: string }[],
  limit: number,
): number[] {
  const byDomain = new Map<string, number[]>();
  // survivors is ascending by uid (oldest -> newest); reverse per-domain so
  // each domain's list is newest-first.
  for (const { uid, domain } of survivors) {
    const list = byDomain.get(domain);
    if (list) list.unshift(uid);
    else byDomain.set(domain, [uid]);
  }

  const domains = [...byDomain.keys()];
  const pointers = domains.map(() => 0);
  const picked: number[] = [];
  let advanced = true;
  while (picked.length < limit && advanced) {
    advanced = false;
    for (let i = 0; i < domains.length && picked.length < limit; i++) {
      const list = byDomain.get(domains[i]) as number[];
      if (pointers[i] < list.length) {
        picked.push(list[pointers[i]] as number);
        pointers[i]++;
        advanced = true;
      }
    }
  }
  return picked;
}

/**
 * Finds emails that look like purchase confirmations by connecting over IMAP
 * with a Gmail App Password and running a Gmail-flavored search (X-GM-RAW)
 * against the All Mail folder. This is the App Password equivalent of
 * `findPurchaseCandidateEmails` in `~/lib/google/gmail.ts`, which uses the
 * Gmail API/OAuth instead. Callers still need to run the results through AI
 * extraction - this only narrows down candidates so the AI never sees the
 * whole inbox.
 */
export async function findPurchaseCandidateEmailsViaImap(
  email: string,
  appPassword: string,
  { since, limit = 20 }: { since?: Date; limit?: number } = {},
): Promise<PurchaseCandidateEmail[]> {
  const client = new ImapFlow({
    host: GMAIL_IMAP_HOST,
    port: GMAIL_IMAP_PORT,
    secure: true,
    auth: { user: email, pass: appPassword },
    logger: false,
  });

  await client.connect();
  try {
    const mailboxes = await client.list();
    const allMail =
      mailboxes.find((box) => box.specialUse === "\\All")?.path ?? "INBOX";

    const lock = await client.getMailboxLock(allMail);
    try {
      const query = since
        ? `${PURCHASE_EMAIL_QUERY} after:${Math.floor(since.getTime() / 1000)}`
        : `${PURCHASE_EMAIL_QUERY} newer_than:365d`;

      const uids = await client.search({ gmailraw: query }, { uid: true });
      if (!uids || uids.length === 0) return [];

      // Phase 1: pull just the envelopes (subject/from - cheap) for a wide
      // window of the most-recent matches, and drop the ones whose subject
      // reads as marketing/lifecycle noise. UIDs are ascending, so the tail
      // is the newest.
      const windowUids = uids.slice(-ENVELOPE_SCAN_WINDOW);
      const survivors: { uid: number; domain: string }[] = [];
      for await (const message of client.fetch(
        windowUids,
        { envelope: true },
        { uid: true },
      )) {
        if (message.uid == null) continue;
        if (looksLikeMarketingNoise(message.envelope?.subject ?? "")) continue;
        const fromAddress = message.envelope?.from?.[0]?.address ?? "";
        survivors.push({ uid: message.uid, domain: senderDomain(fromAddress) });
      }
      if (survivors.length === 0) return [];

      // Phase 2: fetch full bodies only for `limit` survivors, chosen fairly
      // across sender domains (see pickFairlyAcrossSenders) rather than just
      // the newest `limit` overall. Sort ascending first so "newest" is
      // well-defined regardless of the order the server streamed back.
      survivors.sort((a, b) => a.uid - b.uid);
      const targetUids = pickFairlyAcrossSenders(survivors, limit);
      const results: PurchaseCandidateEmail[] = [];

      for await (const message of client.fetch(
        targetUids,
        { source: true, envelope: true },
        { uid: true },
      )) {
        const raw = message.source?.toString("utf-8") ?? "";
        const { html, text } = parseRawEmail(raw);
        const bodyText = html ? stripHtml(html) : (text ?? "");

        results.push({
          id: message.envelope?.messageId ?? String(message.uid),
          from: message.envelope?.from?.[0]?.address ?? "",
          subject: message.envelope?.subject ?? "",
          bodyText,
          imageUrl: html ? extractFirstImageUrl(html) : null,
        });
      }

      return results;
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => client.close());
  }
}
