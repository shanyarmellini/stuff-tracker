import { ImapFlow } from "imapflow";
import { env } from "~/env";
import type { PurchaseCandidateEmail } from "~/lib/ai/extractPurchases";
import { scoreEmailForCategories, scoreSubjectAsPurchase } from "~/lib/ai/jev";
import {
  describeScanCategories,
  pickedItemKeywordPattern,
} from "~/lib/categories/taxonomy";
import { compactEmailForAi } from "~/lib/email/compact-for-ai";
import { extractFirstImageUrl, stripHtml } from "~/lib/email/html";
import { parseRawEmail } from "~/lib/email/mime";
import { PRICE_PATTERN } from "~/lib/email/price";
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
const TIME_CONSTRAINT = 90;

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

function partition<T>(items: T[], keep: (item: T) => boolean): [T[], T[]] {
  const kept: T[] = [];
  const dropped: T[] = [];
  for (const item of items) (keep(item) ? kept : dropped).push(item);
  return [kept, dropped];
}

export type EnvelopeSummary = { subject: string; from: string };

type Envelope = EnvelopeSummary & { uid: number };

export type FullEmail = PurchaseCandidateEmail & { uid: number };

export function toEnvelopeSummary({
  subject,
  from,
}: EnvelopeSummary): EnvelopeSummary {
  return { subject, from };
}

// Any word-like token of 4+ letters/digits/hyphens, optionally prefixed by "#".
const ORDER_TOKEN_PATTERN = /(#\s*)?\b([a-z0-9][a-z0-9-]{2,}[a-z0-9])\b/gi;
const ORDER_KEYWORD_PATTERN = /\b(order|confirmation|invoice|receipt)\b/i;

/**
 * Subject line only - the body is never searched for an order number.
 * A "#"-prefixed token with a digit wins ("Order Confirmation #12345");
 * otherwise, if the subject mentions an order, the first token with a digit
 * ("Your order 112-1234567-1234567 has shipped"). Amounts like "$25" are
 * skipped.
 */
function findOrderNumber(subject: string): string | null {
  let fallback: string | null = null;
  for (const match of subject.matchAll(ORDER_TOKEN_PATTERN)) {
    const token = match[2];
    if (!/\d/.test(token)) continue;
    if (/[$€£¥₹]\s*$/.test(subject.slice(0, match.index))) continue;
    if (match[1]) return token.toUpperCase();
    fallback ??= token.toUpperCase();
  }
  return fallback && ORDER_KEYWORD_PATTERN.test(subject) ? fallback : null;
}

/**
 * Keeps one email per order: only the exact sender address + order number in
 * the subject line are compared. For each pair, the earliest email (lowest uid, usually the
 * order confirmation) survives and every later one for that order is dropped,
 * however many there are. Emails with no order number in the subject are
 * always kept.
 */
function dedupeByOrderNumber<T extends Envelope>(
  emails: T[],
): [T[], (T & { orderNumber: string })[]] {
  const orders = new Map<T, { key: string; orderNumber: string }>();
  const firstUidByKey = new Map<string, number>();
  for (const email of emails) {
    const orderNumber = findOrderNumber(email.subject);
    if (!orderNumber) continue;
    const key = `${email.from.toLowerCase()}|${orderNumber}`;
    orders.set(email, { key, orderNumber });
    const firstUid = firstUidByKey.get(key);
    if (firstUid === undefined || email.uid < firstUid) {
      firstUidByKey.set(key, email.uid);
    }
  }

  const kept: T[] = [];
  const dropped: (T & { orderNumber: string })[] = [];
  for (const email of emails) {
    const order = orders.get(email);
    if (order && firstUidByKey.get(order.key) !== email.uid) {
      dropped.push({ ...email, orderNumber: order.orderNumber });
    } else {
      kept.push(email);
    }
  }
  return [kept, dropped];
}

function buildDateLimitQuery(connectedAt: string): string {
  const earliest = new Date(connectedAt);
  earliest.setDate(earliest.getDate() - TIME_CONSTRAINT);
  return `after:${Math.floor(earliest.getTime() / 1000)}`;
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
// Lower than the subject threshold: dropping a real in-category purchase is
// worse than sending Claude one extra email.
const JEV_CATEGORY_THRESHOLD = 0.3;
const JEV_CONCURRENCY = 10;
// Item names and prices come first in trimmed emails; this is plenty for a
// yes/no category question.
const JEV_CONTENT_MAX_CHARS = 2000;

export type JevFailure = { subject: string; reason: string };

type JevFilterResult<T> = {
  kept: T[];
  dropped: T[];
  failures: JevFailure[];
};

function normalizeSubject(subject: string): string {
  return subject.trim().replace(/\s+/g, " ");
}

function describeJevError(err: unknown): string {
  return err instanceof Error && err.name === "TimeoutError"
    ? "Timed out"
    : errorMessage(err);
}

/**
 * Scores every key with Jev, at most JEV_CONCURRENCY at a time. Failed or
 * timed-out keys get no score and are reported with `describe(key)`.
 */
async function scoreAllWithJev<K>(
  keys: K[],
  score: (key: K) => Promise<number>,
  describe: (key: K) => string,
): Promise<{ scores: Map<K, number>; failures: JevFailure[] }> {
  const scores = new Map<K, number>();
  const failures: JevFailure[] = [];

  // Rolling pool: each worker picks up the next key as soon as its last
  // request finishes, so one slow request never holds up the others.
  let next = 0;
  async function worker() {
    while (next < keys.length) {
      const key = keys[next++];
      try {
        scores.set(key, await score(key));
      } catch (err) {
        failures.push({
          subject: describe(key),
          reason: describeJevError(err),
        });
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(JEV_CONCURRENCY, keys.length) }, worker),
  );
  return { scores, failures };
}

/**
 * Subject-only AI pass after the subject regex filter. Keeps emails Jev thinks
 * are purchase confirmations. Identical subjects get identical answers, so
 * each unique subject is sent once and its score applies to every email with
 * it. If Jev is not configured or a request fails or times out, the email is
 * kept, so a Jev outage never drops a real purchase; failures are returned so
 * the admin tool can show them.
 */
async function filterSubjectsWithJev<T extends EnvelopeSummary>(
  emails: T[],
): Promise<JevFilterResult<T> & { uniqueSubjects: number }> {
  if (!env.JEV_API_KEY) {
    return { kept: emails, dropped: [], uniqueSubjects: 0, failures: [] };
  }

  const subjects = [
    ...new Set(emails.map((email) => normalizeSubject(email.subject))),
  ];
  const { scores, failures } = await scoreAllWithJev(
    subjects,
    scoreSubjectAsPurchase,
    (subject) => subject,
  );

  const [kept, dropped] = partition(emails, (email) => {
    const score = scores.get(normalizeSubject(email.subject));
    return score === undefined || score >= JEV_PURCHASE_THRESHOLD;
  });
  return { kept, dropped, uniqueSubjects: subjects.length, failures };
}

// What the keyword check and the Jev content check read: sender, subject
// and the start of the trimmed body (item names and prices come first).
function categoryCheckText(email: FullEmail): string {
  return `From: ${email.from}\nSubject: ${email.subject}\n\n${compactEmailForAi(
    email.bodyText,
  ).text.slice(0, JEV_CONTENT_MAX_CHARS)}`;
}

/**
 * Finds emails that name an item from a picked category ("mascara" with
 * Beauty picked; see `itemKeywords` in the taxonomy). Never drops anything:
 * a match only lets the email skip the Jev content check, and an email with
 * no match goes to that check as usual, since items are often described in
 * words not on any list.
 */
function findItemKeywordMatches(
  emails: FullEmail[],
  scanCategories: string[],
): Set<FullEmail> {
  const pattern = pickedItemKeywordPattern(scanCategories);
  if (!pattern) return new Set();
  return new Set(
    emails.filter((email) => pattern.test(categoryCheckText(email))),
  );
}

/**
 * Item-level pass: Jev reads the trimmed body and says whether any purchased
 * item fits the user's scan categories. Emails in `skip` (keyword matches)
 * are kept without asking. Same safety rule as the subject pass: no Jev, or
 * a failed request, keeps the email.
 */
async function filterContentForCategories(
  emails: FullEmail[],
  scanCategories: string[],
  skip: Set<FullEmail>,
): Promise<JevFilterResult<FullEmail> & { enabled: boolean; checked: number }> {
  const enabled = scanCategories.length > 0 && !!env.JEV_API_KEY;
  if (!enabled) {
    return { kept: emails, dropped: [], failures: [], enabled, checked: 0 };
  }

  const toCheck = emails.filter((email) => !skip.has(email));
  const categories = describeScanCategories(scanCategories);
  const { scores, failures } = await scoreAllWithJev(
    toCheck,
    (email) => scoreEmailForCategories(categoryCheckText(email), categories),
    (email) => email.subject,
  );

  const [kept, dropped] = partition(emails, (email) => {
    const score = scores.get(email);
    return score === undefined || score >= JEV_CATEGORY_THRESHOLD;
  });
  return { kept, dropped, failures, enabled, checked: toCheck.length };
}

// Each call returns the milliseconds since the previous call (or creation).
function createLapTimer(): () => number {
  let last = performance.now();
  return () => {
    const now = performance.now();
    const ms = Math.round(now - last);
    last = now;
    return ms;
  };
}

type FilterStep = { kept: EnvelopeSummary[]; dropped: EnvelopeSummary[] };

type FilterStepsResult = {
  subjectFilter: FilterStep;
  jevFilter: FilterStep & {
    enabled: boolean;
    uniqueSubjects: number;
    failures: JevFailure[];
  };
  dedupe: {
    kept: EnvelopeSummary[];
    dropped: (EnvelopeSummary & { orderNumber: string })[];
  };
  bodyFilter: FilterStep;
  // Nothing is dropped here: `matched` emails skip the content check.
  keywordFilter: {
    scanCategories: string[];
    matched: EnvelopeSummary[];
    unmatched: EnvelopeSummary[];
  };
  contentFilter: FilterStep & {
    enabled: boolean;
    // Emails Jev was asked about; keyword matches skip the check.
    checked: number;
    failures: JevFailure[];
  };
  // How long each step took, in milliseconds.
  timings: {
    subjectFilter: number;
    jevFilter: number;
    dedupe: number;
    download: number;
    bodyFilter: number;
    keywordFilter: number;
    contentFilter: number;
  };
  candidates: FullEmail[];
};

/**
 * Every step after the keyword search, shared by the real scan and the mock
 * scan: subject noise filter -> Jev subject filter -> order-number dedupe ->
 * `download` -> body price filter -> item keyword check -> Jev category
 * content check. Everything up to and including the dedupe works on
 * subject/sender only, so bodies are only downloaded for emails the dedupe
 * keeps. The keyword and content steps only apply when the user picked scan
 * categories.
 */
async function runFilterSteps<T extends Envelope>(
  matched: T[],
  scanCategories: string[],
  download: (emails: T[]) => Promise<FullEmail[]>,
): Promise<FilterStepsResult> {
  const lap = createLapTimer();
  const [subjectKept, subjectDropped] = filterSubjectNoise(matched);
  const subjectFilterMs = lap();
  // Jev only ever sees subject lines; no email has been downloaded yet.
  const jev = await filterSubjectsWithJev(subjectKept);
  const jevFilterMs = lap();
  const [deduped, duplicates] = dedupeByOrderNumber(jev.kept);
  const dedupeMs = lap();
  const fullEmails = await download(deduped);
  const downloadMs = lap();
  const [bodyKept, bodyDropped] = partition(fullEmails, (email) =>
    PRICE_PATTERN.test(email.bodyText),
  );
  const bodyFilterMs = lap();
  const keywordMatches = findItemKeywordMatches(bodyKept, scanCategories);
  const keywordFilterMs = lap();
  const content = await filterContentForCategories(
    bodyKept,
    scanCategories,
    keywordMatches,
  );
  const contentFilterMs = lap();

  return {
    subjectFilter: {
      kept: subjectKept.map(toEnvelopeSummary),
      dropped: subjectDropped.map(toEnvelopeSummary),
    },
    jevFilter: {
      enabled: !!env.JEV_API_KEY,
      kept: jev.kept.map(toEnvelopeSummary),
      dropped: jev.dropped.map(toEnvelopeSummary),
      uniqueSubjects: jev.uniqueSubjects,
      failures: jev.failures,
    },
    dedupe: {
      kept: deduped.map(toEnvelopeSummary),
      dropped: duplicates.map((email) => ({
        ...toEnvelopeSummary(email),
        orderNumber: email.orderNumber,
      })),
    },
    bodyFilter: {
      kept: bodyKept.map(toEnvelopeSummary),
      dropped: bodyDropped.map(toEnvelopeSummary),
    },
    keywordFilter: {
      scanCategories,
      matched: bodyKept
        .filter((email) => keywordMatches.has(email))
        .map(toEnvelopeSummary),
      unmatched: bodyKept
        .filter((email) => !keywordMatches.has(email))
        .map(toEnvelopeSummary),
    },
    contentFilter: {
      enabled: content.enabled,
      checked: content.checked,
      kept: content.kept.map(toEnvelopeSummary),
      dropped: content.dropped.map(toEnvelopeSummary),
      failures: content.failures,
    },
    timings: {
      subjectFilter: subjectFilterMs,
      jevFilter: jevFilterMs,
      dedupe: dedupeMs,
      download: downloadMs,
      bodyFilter: bodyFilterMs,
      keywordFilter: keywordFilterMs,
      contentFilter: contentFilterMs,
    },
    candidates: content.kept,
  };
}

export type ImapScanPipelineResult = Omit<FilterStepsResult, "timings"> & {
  dateLimit: { query: string; days: number; matchedCount: number };
  keywordSearch: { query: string; matched: EnvelopeSummary[] };
  timings: FilterStepsResult["timings"] & {
    connect: number;
    dateLimit: number;
    keywordSearch: number;
    total: number;
  };
};

/**
 * Narrows a user's inbox down to likely purchase confirmations over IMAP
 * (Gmail App Password), recording what every step kept so the admin debug
 * tool can show it: date limit -> keyword search -> the shared filter steps
 * (see `runFilterSteps`). Makes one Jev call per unique subject that passes
 * the subject noise filter, plus one per email the content check reads;
 * `candidates` still need AI extraction.
 */
export async function runImapScanPipeline(
  connection: AppPasswordConnection,
  scanCategories: string[],
): Promise<ImapScanPipelineResult> {
  const dateQuery = buildDateLimitQuery(connection.created_at);
  // Same as running the keyword query over only the date-limited emails.
  const keywordQuery = `${dateQuery} ${PURCHASE_EMAIL_QUERY}`;
  const start = performance.now();
  const lap = createLapTimer();
  return withAllMailLocked(connection, async (client) => {
    const connectMs = lap();
    const dateUids = await client.search(
      { gmailraw: dateQuery },
      { uid: true },
    );
    const dateLimitMs = lap();
    const matched = await fetchEnvelopes(client, keywordQuery);
    const keywordSearchMs = lap();
    const { timings, ...steps } = await runFilterSteps(
      matched,
      scanCategories,
      (emails) => fetchFullEmails(client, emails),
    );

    return {
      dateLimit: {
        query: dateQuery,
        days: TIME_CONSTRAINT,
        matchedCount: dateUids ? dateUids.length : 0,
      },
      keywordSearch: {
        query: keywordQuery,
        matched: matched.map(toEnvelopeSummary),
      },
      ...steps,
      timings: {
        connect: connectMs,
        dateLimit: dateLimitMs,
        keywordSearch: keywordSearchMs,
        ...timings,
        total: Math.round(performance.now() - start),
      },
    };
  });
}

/** The real scan: just the emails `runImapScanPipeline` hands to the AI. */
export async function findPurchaseCandidateEmailsViaImap(
  connection: AppPasswordConnection,
  scanCategories: string[],
): Promise<PurchaseCandidateEmail[]> {
  return (await runImapScanPipeline(connection, scanCategories)).candidates;
}

export type MockScanPipelineResult = Omit<FilterStepsResult, "timings"> & {
  timings: FilterStepsResult["timings"] & { total: number };
};

/**
 * Runs the same filter steps as the real scan over in-memory test emails
 * (see ~/lib/google/mock-emails), which arrive with their bodies already, so
 * there is no Gmail connection, search or download.
 */
export async function runMockScanPipeline(
  emails: FullEmail[],
  scanCategories: string[],
): Promise<MockScanPipelineResult> {
  const start = performance.now();
  const { timings, ...steps } = await runFilterSteps(
    emails,
    scanCategories,
    async (kept) => kept,
  );
  return {
    ...steps,
    timings: { ...timings, total: Math.round(performance.now() - start) },
  };
}
