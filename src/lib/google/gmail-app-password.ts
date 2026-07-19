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
  '(receipt OR invoice OR order OR purchase OR shipped OR delivered OR "payment confirmation" OR "thank you for your")';

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

      const targetUids = uids.slice(-limit);
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
