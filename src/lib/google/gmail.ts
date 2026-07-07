import { google } from "googleapis";
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
};

export async function getGmailConnection(
  userId: string,
  { limit = 10 }: { limit?: number } = {},
): Promise<GmailConnection | null> {
  const connection = await loadConnection(userId);
  if (!connection) return null;

  const messages = await getRecentEmails(userId, connection, { limit });
  return { email: connection.email, messages };
}

async function getRecentEmails(
  userId: string,
  connection: StoredConnection,
  { limit = 10 }: { limit?: number } = {},
): Promise<GmailMessage[]> {
  const oauthClient = await getAuthorizedClient(userId, connection);
  const gmail = google.gmail({ version: "v1", auth: oauthClient });

  const { data: list } = await gmail.users.messages.list({
    userId: "me",
    maxResults: limit,
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

  return details.map((res) => ({
    id: res.data.id ?? "",
    from: headerValue(res.data.payload?.headers, "From"),
    subject: headerValue(res.data.payload?.headers, "Subject"),
    snippet: res.data.snippet ?? "",
    date: headerValue(res.data.payload?.headers, "Date"),
  }));
}
