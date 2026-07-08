import { type gmail_v1, google } from "googleapis";
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

async function getAuthorizedClient(
  userId: string,
  connection: StoredConnection,
) {
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

  return oauthClient;
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

export type GmailConnection = {
  email: string | null;
  messages: GmailMessage[];
  nextPageToken: string | null;
};

export async function getGmailConnection(
  userId: string,
  { limit = 10, pageToken }: { limit?: number; pageToken?: string } = {},
): Promise<GmailConnection | null> {
  const connection = await loadConnection(userId);
  if (!connection) return null;

  const { messages, nextPageToken } = await getRecentEmails(
    userId,
    connection,
    { limit, pageToken },
  );
  return { email: connection.email, messages, nextPageToken };
}

async function getRecentEmails(
  userId: string,
  connection: StoredConnection,
  { limit = 10, pageToken }: { limit?: number; pageToken?: string } = {},
): Promise<{ messages: GmailMessage[]; nextPageToken: string | null }> {
  const oauthClient = await getAuthorizedClient(userId, connection);
  const gmail = google.gmail({ version: "v1", auth: oauthClient });

  const { data: list } = await gmail.users.messages.list({
    userId: "me",
    maxResults: limit,
    pageToken,
  });

  const ids = (list.messages ?? [])
    .map((message) => message.id)
    .filter((id): id is string => !!id);

  const details = await Promise.all(
    ids.map((id) =>
      gmail.users.messages.get({
        userId: "me",
        id,
        format: "metadata",
        metadataHeaders: ["From", "Subject", "Date"],
      }),
    ),
  );

  return {
    messages: details.map((res) => ({
      id: res.data.id ?? "",
      from: headerValue(res.data.payload?.headers, "From"),
      subject: headerValue(res.data.payload?.headers, "Subject"),
      snippet: res.data.snippet ?? "",
      date: headerValue(res.data.payload?.headers, "Date"),
    })),
    nextPageToken: list.nextPageToken ?? null,
  };
}

export type PurchaseCandidateEmail = {
  id: string;
  from: string;
  subject: string;
  bodyText: string;
  imageUrl: string | null;
};

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

  const oauthClient = await getAuthorizedClient(userId, connection);
  const gmail = google.gmail({ version: "v1", auth: oauthClient });

  const query = since
    ? `${PURCHASE_EMAIL_QUERY} after:${Math.floor(since.getTime() / 1000)}`
    : `${PURCHASE_EMAIL_QUERY} newer_than:180d`;

  const { data: list } = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults: limit,
  });

  const ids = (list.messages ?? [])
    .map((message) => message.id)
    .filter((id): id is string => !!id);

  const details = await Promise.all(
    ids.map((id) =>
      gmail.users.messages.get({ userId: "me", id, format: "full" }),
    ),
  );

  return details.map((res) => {
    const html = findBodyPart(res.data.payload, "text/html");
    const bodyText = html
      ? stripHtml(html)
      : (findBodyPart(res.data.payload, "text/plain") ??
        res.data.snippet ??
        "");

    return {
      id: res.data.id ?? "",
      from: headerValue(res.data.payload?.headers, "From"),
      subject: headerValue(res.data.payload?.headers, "Subject"),
      bodyText,
      imageUrl: html ? extractFirstImageUrl(html) : null,
    };
  });
}
