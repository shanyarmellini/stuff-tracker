import { type gmail_v1, google } from "googleapis";
import type { PurchaseCandidateEmail } from "~/lib/ai/extractPurchases";
import { extractFirstImageUrl, stripHtml } from "~/lib/email/html";
import { createGoogleOAuthClient } from "~/lib/google/oauth";
import { createAdminClient } from "~/lib/supabase/admin";

export type GmailMessage = {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
};

type StoredConnection = {
  email: string | null;
  refresh_token: string;
  access_token: string | null;
  token_expires_at: string | null;
};

async function loadConnection(
  userId: string,
): Promise<StoredConnection | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("google_connections")
    .select("email, refresh_token, access_token, token_expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

async function getGmailClient(userId: string, connection: StoredConnection) {
  const oauthClient = createGoogleOAuthClient();
  oauthClient.setCredentials({
    refresh_token: connection.refresh_token,
    access_token: connection.access_token ?? undefined,
    expiry_date: connection.token_expires_at
      ? new Date(connection.token_expires_at).getTime()
      : undefined,
  });

  const isExpired =
    !connection.access_token ||
    !connection.token_expires_at ||
    new Date(connection.token_expires_at).getTime() <= Date.now();

  if (isExpired) {
    const { credentials } = await oauthClient.refreshAccessToken();
    oauthClient.setCredentials(credentials);
    await createAdminClient()
      .from("google_connections")
      .update({
        access_token: credentials.access_token,
        token_expires_at: credentials.expiry_date
          ? new Date(credentials.expiry_date).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
  }

  return google.gmail({ version: "v1", auth: oauthClient });
}

function headerValue(
  headers: { name?: string | null; value?: string | null }[] | undefined,
  name: string,
): string {
  return (
    headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ??
    ""
  );
}

/** Lists messages matching `params`, then fetches each one's details. */
async function listMessages(
  gmail: gmail_v1.Gmail,
  params: gmail_v1.Params$Resource$Users$Messages$List,
  getParams: Omit<gmail_v1.Params$Resource$Users$Messages$Get, "id">,
) {
  const { data: list } = await gmail.users.messages.list({
    userId: "me",
    ...params,
  });
  const ids = (list.messages ?? [])
    .map((message) => message.id)
    .filter((id): id is string => !!id);
  const details = await Promise.all(
    ids.map((id) =>
      gmail.users.messages.get({ userId: "me", id, ...getParams }),
    ),
  );
  return {
    messages: details.map((res) => res.data),
    nextPageToken: list.nextPageToken ?? null,
  };
}

type RecentGmailMessages = {
  email: string | null;
  messages: GmailMessage[];
  nextPageToken: string | null;
};

/** Lists the user's most recent Gmail messages, or null if not connected. */
export async function listRecentGmailMessages(
  userId: string,
  { limit = 10, pageToken }: { limit?: number; pageToken?: string } = {},
): Promise<RecentGmailMessages | null> {
  const connection = await loadConnection(userId);
  if (!connection) return null;

  const gmail = await getGmailClient(userId, connection);
  const { messages, nextPageToken } = await listMessages(
    gmail,
    { maxResults: limit, pageToken },
    { format: "metadata", metadataHeaders: ["From", "Subject", "Date"] },
  );
  return {
    email: connection.email,
    messages: messages.map((message) => ({
      id: message.id ?? "",
      from: headerValue(message.payload?.headers, "From"),
      subject: headerValue(message.payload?.headers, "Subject"),
      snippet: message.snippet ?? "",
      date: headerValue(message.payload?.headers, "Date"),
    })),
    nextPageToken,
  };
}

// Narrower than the IMAP query in gmail-app-password.ts: this path has no
// code-side marketing filter, so every match goes straight to the AI.
const PURCHASE_EMAIL_QUERY =
  '(receipt OR invoice OR "order confirmation" OR "your order" OR "order has shipped" OR "thanks for your order")';

function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf-8");
}

function findBodyPart(
  part: gmail_v1.Schema$MessagePart | undefined,
  mimeType: string,
): string | null {
  if (!part) return null;
  if (part.mimeType === mimeType && part.body?.data) {
    return decodeBase64Url(part.body.data);
  }
  for (const child of part.parts ?? []) {
    const found = findBodyPart(child, mimeType);
    if (found) return found;
  }
  return null;
}

/**
 * Finds emails that look like purchase confirmations, fetched since the
 * given date (or the last 180 days if none). Callers still need to run the
 * results through AI extraction - this only narrows down candidates via a
 * cheap Gmail search so the AI never sees the whole inbox.
 */
export async function findPurchaseCandidateEmails(
  userId: string,
  { since, limit = 20 }: { since?: Date; limit?: number } = {},
): Promise<PurchaseCandidateEmail[] | null> {
  const connection = await loadConnection(userId);
  if (!connection) return null;

  const gmail = await getGmailClient(userId, connection);
  const query = since
    ? `${PURCHASE_EMAIL_QUERY} after:${Math.floor(since.getTime() / 1000)}`
    : `${PURCHASE_EMAIL_QUERY} newer_than:180d`;
  const { messages } = await listMessages(
    gmail,
    { q: query, maxResults: limit },
    { format: "full" },
  );

  return messages.map((message) => {
    const html = findBodyPart(message.payload, "text/html");
    return {
      id: message.id ?? "",
      from: headerValue(message.payload?.headers, "From"),
      subject: headerValue(message.payload?.headers, "Subject"),
      bodyText: html
        ? stripHtml(html)
        : (findBodyPart(message.payload, "text/plain") ??
          message.snippet ??
          ""),
      imageUrl: html ? extractFirstImageUrl(html) : null,
    };
  });
}
