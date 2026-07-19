import { ImapFlow } from "imapflow";

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
