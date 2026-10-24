import { ImapFlow } from "imapflow";
import type { PurchaseCandidateEmail } from "~/lib/ai/extractPurchases";
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

type AppPasswordConnection = { email: string; app_password: string };

/** The user's stored Gmail App Password credentials, or null if not connected. */
export async function loadAppPasswordConnection(
  userId: string,
): Promise<AppPasswordConnection | null> {
  const { data } = await createAdminClient()
    .from("gmail_app_connections")
    .select("email, app_password")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

/** Validates credentials by opening and immediately closing an IMAP session. */
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

// Deliberately broad: anything that might be a purchase matches here, and
// the subject-based noise filter below narrows it down before any body is
// fetched.
const PURCHASE_EMAIL_QUERY =
  '(receipt OR invoice OR order OR purchase OR shipped OR delivered OR "payment confirmation" OR "thank you for your" OR trip OR ride OR "thanks for riding")';

// How many of the newest keyword matches get their envelopes checked. Older
// matches are never considered, so this caps how far back a scan reaches.
const ENVELOPE_SCAN_WINDOW = 400;

// Matched against the subject line only (bodies aren't fetched yet).
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

function senderDomain(address: string): string {
  return address.toLowerCase().split("@")[1] ?? address.toLowerCase();
}

/**
 * Picks up to `limit` uids round-robin across sender domains (newest first
 * within each), so one prolific sender can't crowd out everyone else.
 */
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

  const queues = [...byDomain.values()];
  const picked: number[] = [];
  for (let round = 0; picked.length < limit; round++) {
    const roundPicks = queues
      .filter((queue) => round < queue.length)
      .map((queue) => queue[round]);
    if (roundPicks.length === 0) break;
    picked.push(...roundPicks.slice(0, limit - picked.length));
  }
  return picked;
}

function buildGmailRawQuery(since?: Date): string {
  return since
    ? `${PURCHASE_EMAIL_QUERY} after:${Math.floor(since.getTime() / 1000)}`
    : `${PURCHASE_EMAIL_QUERY} newer_than:365d`;
}

export type EnvelopeSummary = { subject: string; from: string };

type EnvelopeSurvivor = EnvelopeSummary & { uid: number; domain: string };

type EnvelopeScanResult = {
  totalMatchedByKeywordQuery: number;
  considered: EnvelopeSummary[];
  survivors: EnvelopeSurvivor[];
  droppedAsNoise: EnvelopeSummary[];
};

// Phase 1 of the scan: pull just the envelopes (subject/from - cheap) for a
// wide window of the most-recent keyword matches, and drop the ones whose
// subject reads as marketing/lifecycle noise. Shared by the real scan
// (`findPurchaseCandidateEmailsViaImap`) and the admin debug tool
// (`debugScanPipeline`).
async function scanEnvelopes(
  client: ImapFlow,
  allMail: string,
  query: string,
): Promise<EnvelopeScanResult> {
  const lock = await client.getMailboxLock(allMail);
  try {
    const uids = await client.search({ gmailraw: query }, { uid: true });
    if (!uids || uids.length === 0) {
      return {
        totalMatchedByKeywordQuery: 0,
        considered: [],
        survivors: [],
        droppedAsNoise: [],
      };
    }

    // UIDs are ascending, so the tail is the newest.
    const windowUids = uids.slice(-ENVELOPE_SCAN_WINDOW);
    const considered: EnvelopeSummary[] = [];
    const survivors: EnvelopeSurvivor[] = [];
    const droppedAsNoise: EnvelopeSummary[] = [];
    for await (const message of client.fetch(
      windowUids,
      { envelope: true },
      { uid: true },
    )) {
      if (message.uid == null) continue;
      const subject = message.envelope?.subject ?? "";
      const fromAddress = message.envelope?.from?.[0]?.address ?? "";
      considered.push({ subject, from: fromAddress });
      // TODO: subject-keyword matching is too narrow; replace with a smarter
      // noise classifier.
      if (looksLikeMarketingNoise(subject)) {
        droppedAsNoise.push({ subject, from: fromAddress });
        continue;
      }
      survivors.push({
        uid: message.uid,
        domain: senderDomain(fromAddress),
        subject,
        from: fromAddress,
      });
    }
    return {
      totalMatchedByKeywordQuery: uids.length,
      considered,
      survivors,
      droppedAsNoise,
    };
  } finally {
    lock.release();
  }
}

async function openAllMailClient(
  email: string,
  appPassword: string,
): Promise<{ client: ImapFlow; allMail: string }> {
  const client = createImapClient(email, appPassword);
  await client.connect();
  const mailboxes = await client.list();
  const allMail =
    mailboxes.find((box) => box.specialUse === "\\All")?.path ?? "INBOX";
  return { client, allMail };
}

// Phase 2a: choose which survivors get their full bodies fetched - `limit`
// of them, fairly across sender domains (see pickFairlyAcrossSenders) rather
// than just the newest `limit` overall. Sorts ascending first so "newest" is
// well-defined regardless of the order the server streamed back.
function selectSurvivorsForBodyFetch(
  survivors: EnvelopeSurvivor[],
  limit: number,
): EnvelopeSurvivor[] {
  const sorted = [...survivors].sort((a, b) => a.uid - b.uid);
  const pickedUids = pickFairlyAcrossSenders(sorted, limit);
  const byUid = new Map(sorted.map((survivor) => [survivor.uid, survivor]));
  return pickedUids.map((uid) => byUid.get(uid) as EnvelopeSurvivor);
}

// Phase 2b: fetch and parse full bodies for the selected uids.
async function fetchCandidateEmails(
  client: ImapFlow,
  uids: number[],
): Promise<PurchaseCandidateEmail[]> {
  const results: PurchaseCandidateEmail[] = [];
  for await (const message of client.fetch(
    uids,
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
  const { client, allMail } = await openAllMailClient(email, appPassword);
  try {
    const { survivors } = await scanEnvelopes(
      client,
      allMail,
      buildGmailRawQuery(since),
    );
    if (survivors.length === 0) return [];

    const selected = selectSurvivorsForBodyFetch(survivors, limit);
    return await fetchCandidateEmails(
      client,
      selected.map((survivor) => survivor.uid),
    );
  } finally {
    await client.logout().catch(() => client.close());
  }
}

export type ScanPipelineDebugResult = {
  envelopeScan: {
    keywordQuery: string;
    totalMatchedByKeywordQuery: number;
    windowSize: number;
    considered: EnvelopeSummary[];
  };
  noiseFilter: {
    kept: EnvelopeSummary[];
    dropped: EnvelopeSummary[];
  };
  fairSelection: {
    limit: number;
    selected: EnvelopeSummary[];
    notSelected: EnvelopeSummary[];
  };
  candidates: PurchaseCandidateEmail[];
};

function toSummary({ subject, from }: EnvelopeSummary): EnvelopeSummary {
  return { subject, from };
}

/**
 * Runs the same IMAP phases as `findPurchaseCandidateEmailsViaImap`, but
 * records what each phase produced (envelope scan -> noise filter -> fair
 * sender selection -> body fetch) so the admin debug tool can show every
 * step. Never touches the AI.
 */
export async function debugScanPipeline(
  email: string,
  appPassword: string,
  { since, limit }: { since?: Date; limit: number },
): Promise<ScanPipelineDebugResult> {
  const keywordQuery = buildGmailRawQuery(since);
  const { client, allMail } = await openAllMailClient(email, appPassword);
  try {
    const {
      totalMatchedByKeywordQuery,
      considered,
      survivors,
      droppedAsNoise,
    } = await scanEnvelopes(client, allMail, keywordQuery);

    const selected = selectSurvivorsForBodyFetch(survivors, limit);
    const selectedUids = new Set(selected.map((survivor) => survivor.uid));
    const candidates =
      selected.length > 0
        ? await fetchCandidateEmails(client, [...selectedUids])
        : [];

    return {
      envelopeScan: {
        keywordQuery,
        totalMatchedByKeywordQuery,
        windowSize: ENVELOPE_SCAN_WINDOW,
        considered,
      },
      noiseFilter: {
        kept: survivors.map(toSummary),
        dropped: droppedAsNoise,
      },
      fairSelection: {
        limit,
        selected: selected.map(toSummary),
        notSelected: survivors
          .filter((survivor) => !selectedUids.has(survivor.uid))
          .map(toSummary),
      },
      candidates,
    };
  } finally {
    await client.logout().catch(() => client.close());
  }
}
