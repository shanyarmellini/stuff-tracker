import { ImapFlow } from "imapflow";
import { env } from "~/env";
import type { PurchaseCandidateEmail } from "~/lib/ai/extractPurchases";
import { scoreSubjectAsPurchase } from "~/lib/ai/jev";
import { extractFirstImageUrl, stripHtml } from "~/lib/email/html";
import { parseRawEmail } from "~/lib/email/mime";
import { createAdminClient } from "~/lib/supabase/admin";
import { errorMessage } from "~/lib/utils";

const GMAIL_IMAP_HOST = "imap.gmail.com";
const GMAIL_IMAP_PORT = 993;

export type AppPasswordCheckResult =
  | { ok: true }
  | { ok: false; reason: "invalid_credentials" | "connection_failed" };

function createImapClient(email: string, appPassword: string): ImapFlow {
  return new ImapFlow({
    host: GMAIL_IMAP_HOST,
    port: GMAIL_IMAP_PORT,
    secure: true,
    auth: { user: email, pass: appPassword },
    logger: false,
  });
}

type AppPasswordConnection = {
  email: string;
  app_password: string;
  created_at: string;
};

//storing gmail app password connection in supabase
export async function loadAppPasswordConnection(
  userId: string,
): Promise<AppPasswordConnection | null> {
  const { data } = await createAdminClient()
    .from("gmail_app_connections")
    .select("email, app_password, created_at")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

//checks if gmail app password is valid by opening and closing the IMAP scan super quick
export async function checkGmailAppPassword(
  email: string,
  appPassword: string,
): Promise<AppPasswordCheckResult> {
  const client = createImapClient(email, appPassword);

  try {
    await client.connect();
    await client.logout();
    return { ok: true };
  } catch (err) {
    const isAuthError =
      /auth|credential|password|invalid/i.test(errorMessage(err)) ||
      (err as { authenticationFailed?: boolean })?.authenticationFailed;
    return {
      ok: false,
      reason: isAuthError ? "invalid_credentials" : "connection_failed",
    };
  } finally {
    client.close();
  }
}

// extremely broad, searches the FULL email for these words to start to narrow things down
const PURCHASE_EMAIL_QUERY =
  '(receipt OR invoice OR order OR purchase OR shipped OR delivered OR "payment confirmation" OR "thank you for your" OR trip OR ride OR "thanks for riding")';

// adding a limit to how many emails are able to be even looked atinitially
const TIME_CONSTRAINT = 30;

// Matched against the subject line only, before any body is downloaded.
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
  /\bwelcome to\b/i,
  /special offer|top fans|for you:|just for you/i,
  /earn (a |your )?\$?\d|\breward(s)?\b|credit today|free (shipping|gift) when/i,
  /forgot (something|to (complete|finish))|complete your order\?|finish (checking out|your order)/i,
  /can you believe|it'?s been \d+ (year|month|week)s?\b|happy anniversary/i,
  /save[:\s]*[€$£]\d|buy (one|a)\b.*get (one|another)\b.*free/i,
];
function looksLikeMarketingNoise(subject: string): boolean {
  if (!subject) return false;
  return MARKETING_SUBJECT_PATTERNS.some((pattern) => pattern.test(subject));
}

// Matched against the body (only for emails that passed the subject filter).
// Deliberately broad: every real purchase states a price somewhere, so only
// emails with no money amount at all are dropped.
const PRICE_PATTERN =
  /[$€£¥₹]\s?\d|\d\s?[€£¥₹]|\d\s?(USD|EUR|GBP|CAD|AUD|JPY|INR)\b/i;

function senderDomain(address: string): string {
  return address.toLowerCase().split("@")[1] ?? address.toLowerCase();
}

function partition<T>(items: T[], keep: (item: T) => boolean): [T[], T[]] {
  const kept: T[] = [];
  const dropped: T[] = [];
  for (const item of items) (keep(item) ? kept : dropped).push(item);
  return [kept, dropped];
}

export type EnvelopeSummary = { subject: string; from: string };

type Envelope = EnvelopeSummary & { uid: number };

type FullEmail = PurchaseCandidateEmail & { uid: number };

function toEnvelopeSummary({
  subject,
  from,
}: EnvelopeSummary): EnvelopeSummary {
  return { subject, from };
}

/**
 * Picks up to `limit` emails round-robin across sender domains (newest first
 * within each), so one prolific sender can't crowd out everyone else.
 */
function pickFairlyAcrossSenders(
  emails: FullEmail[],
  limit: number,
): FullEmail[] {
  const byDomain = new Map<string, FullEmail[]>();
  // Walk oldest -> newest by uid (regardless of the order the server streamed
  // back) and prepend, so each domain's list ends up newest-first.
  const ascending = [...emails].sort((a, b) => a.uid - b.uid);
  for (const email of ascending) {
    const domain = senderDomain(email.from);
    const list = byDomain.get(domain);
    if (list) list.unshift(email);
    else byDomain.set(domain, [email]);
  }

  const queues = [...byDomain.values()];
  const picked: FullEmail[] = [];
  for (let round = 0; picked.length < limit; round++) {
    const roundPicks = queues
      .filter((queue) => round < queue.length)
      .map((queue) => queue[round]);
    if (roundPicks.length === 0) break;
    picked.push(...roundPicks.slice(0, limit - picked.length));
  }
  return picked;
}

function buildGmailRawQuery(connectedAt: string): string {
  const earliest = new Date(connectedAt);
  earliest.setDate(earliest.getDate() - TIME_CONSTRAINT);
  return `${PURCHASE_EMAIL_QUERY} after:${Math.floor(earliest.getTime() / 1000)}`;
}

async function openAllMailClient({
  email,
  app_password,
}: AppPasswordConnection): Promise<{ client: ImapFlow; allMail: string }> {
  const client = createImapClient(email, app_password);
  await client.connect();
  const mailboxes = await client.list();
  const allMail =
    mailboxes.find((box) => box.specialUse === "\\All")?.path ?? "INBOX";
  return { client, allMail };
}

// Keyword search, then just the envelopes (subject/from - cheap) of every
// match.
async function fetchEnvelopes(
  client: ImapFlow,
  query: string,
): Promise<Envelope[]> {
  const uids = await client.search({ gmailraw: query }, { uid: true });
  if (!uids || uids.length === 0) return [];

  const envelopes: Envelope[] = [];
  for await (const message of client.fetch(
    uids,
    { envelope: true },
    { uid: true },
  )) {
    if (message.uid == null) continue;
    envelopes.push({
      uid: message.uid,
      subject: message.envelope?.subject ?? "",
      from: message.envelope?.from?.[0]?.address ?? "",
    });
  }
  return envelopes;
}

async function fetchFullEmails(
  client: ImapFlow,
  envelopes: Envelope[],
): Promise<FullEmail[]> {
  if (envelopes.length === 0) return [];

  const emails: FullEmail[] = [];
  for await (const message of client.fetch(
    envelopes.map((envelope) => envelope.uid),
    { source: true, envelope: true },
    { uid: true },
  )) {
    const raw = message.source?.toString("utf-8") ?? "";
    const { html, text } = parseRawEmail(raw);
    emails.push({
      uid: message.uid,
      id: message.envelope?.messageId ?? String(message.uid),
      from: message.envelope?.from?.[0]?.address ?? "",
      subject: message.envelope?.subject ?? "",
      bodyText: html ? stripHtml(html) : (text ?? ""),
      imageUrl: html ? extractFirstImageUrl(html) : null,
    });
  }
  return emails;
}

// Opens All Mail, runs `fn` with it locked, then always logs out.
async function withAllMailLocked<T>(
  connection: AppPasswordConnection,
  fn: (client: ImapFlow) => Promise<T>,
): Promise<T> {
  const { client, allMail } = await openAllMailClient(connection);
  const lock = await client.getMailboxLock(allMail);
  try {
    return await fn(client);
  } finally {
    lock.release();
    await client.logout().catch(() => client.close());
  }
}

// TODO: subject-keyword matching is too narrow; replace with a smarter
// noise classifier.
function filterSubjectNoise<T extends EnvelopeSummary>(
  emails: T[],
): [T[], T[]] {
  return partition(emails, (email) => !looksLikeMarketingNoise(email.subject));
}

const JEV_PURCHASE_THRESHOLD = 0.5;
const JEV_CONCURRENCY = 10;

/**
 * Subject-only AI pass after the regex filter. Keeps emails Jev thinks are
 * purchase confirmations. If Jev is not configured or a request fails, the
 * email is kept, so a Jev outage never drops a real purchase.
 */
async function filterSubjectsWithJev<T extends EnvelopeSummary>(
  emails: T[],
): Promise<[T[], T[]]> {
  if (!env.JEV_API_KEY) return [emails, []];

  const kept: T[] = [];
  const dropped: T[] = [];
  for (let i = 0; i < emails.length; i += JEV_CONCURRENCY) {
    const batch = emails.slice(i, i + JEV_CONCURRENCY);
    const scores = await Promise.all(
      batch.map((email) =>
        scoreSubjectAsPurchase(email.subject).catch(() => null),
      ),
    );
    batch.forEach((email, j) => {
      const score = scores[j];
      if (
        score === null ||
        score === undefined ||
        score >= JEV_PURCHASE_THRESHOLD
      ) {
        kept.push(email);
      } else {
        dropped.push(email);
      }
    });
  }
  return [kept, dropped];
}

export type NoiseFilterDryRunResult = {
  keywordSearch: { query: string; matchedCount: number };
  timeConstraint: { query: string; days: number; matched: EnvelopeSummary[] };
  subjectFilter: { kept: EnvelopeSummary[]; dropped: EnvelopeSummary[] };
  jevFilter: {
    enabled: boolean;
    kept: EnvelopeSummary[];
    dropped: EnvelopeSummary[];
  };
};

/**
 * Admin debug view of the start of the scan: how many emails match the
 * keyword query across all mail, how many of those fall inside the time
 * constraint, what the regex subject filter keeps, and what the Jev subject
 * filter keeps from that. Stops there - no bodies downloaded, no item
 * creation. Makes one Jev call per subject that passes the regex filter.
 */
export async function runNoiseFilterDryRun(
  connection: AppPasswordConnection,
): Promise<NoiseFilterDryRunResult> {
  const query = buildGmailRawQuery(connection.created_at);
  return withAllMailLocked(connection, async (client) => {
    const keywordUids = await client.search(
      { gmailraw: PURCHASE_EMAIL_QUERY },
      { uid: true },
    );
    const matched = await fetchEnvelopes(client, query);
    const [kept, dropped] = filterSubjectNoise(matched);
    const [jevKept, jevDropped] = await filterSubjectsWithJev(kept);

    return {
      keywordSearch: {
        query: PURCHASE_EMAIL_QUERY,
        matchedCount: keywordUids ? keywordUids.length : 0,
      },
      timeConstraint: {
        query,
        days: TIME_CONSTRAINT,
        matched: matched.map(toEnvelopeSummary),
      },
      subjectFilter: {
        kept: kept.map(toEnvelopeSummary),
        dropped: dropped.map(toEnvelopeSummary),
      },
      jevFilter: {
        enabled: !!env.JEV_API_KEY,
        kept: jevKept.map(toEnvelopeSummary),
        dropped: jevDropped.map(toEnvelopeSummary),
      },
    };
  });
}

/**
 * Narrows a user's inbox down to likely purchase confirmations over IMAP
 * (Gmail App Password): keyword search within the time constraint -> subject
 * noise filter -> body price filter -> fair sender selection. Full bodies are
 * only downloaded for emails that passed the subject filter. The result still
 * needs AI extraction.
 */
export async function findPurchaseCandidateEmailsViaImap(
  connection: AppPasswordConnection,
  limit: number,
): Promise<PurchaseCandidateEmail[]> {
  const query = buildGmailRawQuery(connection.created_at);
  return withAllMailLocked(connection, async (client) => {
    const [subjectKept] = filterSubjectNoise(
      await fetchEnvelopes(client, query),
    );
    const [jevKept] = await filterSubjectsWithJev(subjectKept);
    const bodyKept = (await fetchFullEmails(client, jevKept)).filter((email) =>
      PRICE_PATTERN.test(email.bodyText),
    );
    return pickFairlyAcrossSenders(bodyKept, limit);
  });
}
