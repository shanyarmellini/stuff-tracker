import Link from "next/link";
import { notFound } from "next/navigation";
import {
  type AdminCardItem,
  ItemCardPreview,
} from "~/components/admin/item-card-preview";
import { formatPrice } from "~/lib/format";
import { createAdminClient } from "~/lib/supabase/admin";
import { formatJoinDate, maskAppPassword } from "../_lib";
import { EnvelopeScanTester } from "./envelope-scan-tester";

export const dynamic = "force-dynamic";

type LoggedEmail = {
  message_id: string;
  from: string;
  subject: string;
  body_text: string;
};

type EmailScanLog = {
  id: string;
  scanned_at: string;
  candidates: LoggedEmail[];
  sent_to_ai: LoggedEmail[];
};

type Item = AdminCardItem & {
  id: string;
  gmail_message_id: string | null;
  source: string;
  created_at: string;
};

type GmailAppConnection = {
  email: string;
  app_password: string;
};

function EmailPreview({
  email,
  badge,
  className,
}: {
  email: LoggedEmail;
  badge?: React.ReactNode;
  className?: string;
}) {
  return (
    <details className={className}>
      <summary className="cursor-pointer list-none font-ui text-sm text-foreground">
        <span className="font-medium">{email.subject || "(no subject)"}</span>{" "}
        <span className="text-subtle-foreground">— {email.from}</span>
        {badge}
      </summary>
      <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-muted p-3 font-mono text-xs text-muted-foreground">
        {email.body_text || "(empty body)"}
      </pre>
    </details>
  );
}

function EmailListSection({
  title,
  description,
  emails,
  createdFromMessageIds,
}: {
  title: string;
  description: string;
  emails: LoggedEmail[];
  createdFromMessageIds?: Set<string>;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-6 py-4">
        <h2 className="font-display text-lg tracking-wide text-foreground">
          {title}
        </h2>
        <p className="font-ui text-xs text-subtle-foreground">{description}</p>
      </div>
      {emails.length === 0 ? (
        <p className="px-6 py-4 font-ui text-sm text-subtle-foreground">
          None.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {emails.map((email) => (
            <li key={email.message_id} className="px-6 py-3">
              <EmailPreview
                email={email}
                badge={
                  createdFromMessageIds?.has(email.message_id) && (
                    <span className="ml-2 rounded-full bg-success/10 px-2 py-0.5 font-ui text-xs text-success">
                      created an item
                    </span>
                  )
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ItemsSection({
  title,
  description,
  items,
  emailByMessageId,
}: {
  title: string;
  description: string;
  items: Item[];
  emailByMessageId?: Map<string, LoggedEmail>;
}) {
  return (
    <details className="rounded-2xl border border-border bg-card shadow-sm">
      <summary className="cursor-pointer list-none px-6 py-4">
        <h2 className="font-display text-lg tracking-wide text-foreground">
          {title} ({items.length})
        </h2>
        <p className="font-ui text-xs text-subtle-foreground">
          {description} Click to expand.
        </p>
      </summary>
      {items.length === 0 ? (
        <p className="border-t border-border px-6 py-4 font-ui text-sm text-subtle-foreground">
          None yet.
        </p>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {items.map((item) => {
            const sourceEmail = item.gmail_message_id
              ? emailByMessageId?.get(item.gmail_message_id)
              : undefined;

            return (
              <li key={item.id} className="px-6 py-3">
                <details>
                  <summary className="flex cursor-pointer list-none items-center justify-between font-ui text-sm text-foreground">
                    <span>{item.name}</span>
                    <span className="flex items-center gap-2">
                      {sourceEmail && (
                        <span className="rounded-full bg-success/10 px-2 py-0.5 font-ui text-xs text-success">
                          created from email
                        </span>
                      )}
                      <span className="font-semibold">
                        {formatPrice(item.price)}
                      </span>
                    </span>
                  </summary>
                  <div className="mt-3 flex flex-wrap items-start gap-4">
                    <ItemCardPreview item={item} />
                    {sourceEmail && (
                      <EmailPreview
                        email={sourceEmail}
                        className="max-w-md rounded-xl border border-border bg-card p-3"
                      />
                    )}
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </details>
  );
}

export default async function AdminUserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const supabase = createAdminClient();

  const [
    { data: userData, error: userError },
    { data: connectionData },
    { data: scanLogData },
    { data: itemsData },
  ] = await Promise.all([
    supabase.auth.admin.getUserById(userId),
    supabase
      .from("gmail_app_connections")
      .select("email, app_password")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("email_scan_logs")
      .select("id, scanned_at, candidates, sent_to_ai")
      .eq("user_id", userId)
      .order("scanned_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("items")
      .select(
        "id, name, price, link, photo_url, emoji, quantity, gmail_message_id, source, created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  if (userError || !userData?.user) {
    notFound();
  }

  const user = userData.user;
  const connection = connectionData as GmailAppConnection | null;
  const scanLog = scanLogData as EmailScanLog | null;
  const items: Item[] = (itemsData as Item[]) ?? [];
  const aiItems = items.filter((item) => item.source === "gmail_ai");
  const manualItems = items.filter((item) => item.source === "manual");
  const createdFromMessageIds = new Set(
    aiItems
      .map((item) => item.gmail_message_id)
      .filter((id): id is string => Boolean(id)),
  );
  const emailByMessageId = new Map(
    (scanLog?.candidates ?? []).map((email) => [email.message_id, email]),
  );

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-muted px-8 py-10">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/admin"
          className="mb-4 inline-block font-ui text-sm text-brand hover:text-brand-strong"
        >
          ← Back to all users
        </Link>

        <h1 className="mb-1 font-display text-4xl tracking-wide text-foreground">
          {user.email ?? "—"}
        </h1>
        <p className="mb-8 font-ui text-sm text-subtle-foreground">
          Joined {formatJoinDate(user.created_at)}
        </p>

        <div className="mb-6 rounded-2xl border border-border bg-card px-6 py-4 shadow-sm">
          <h2 className="mb-1 font-display text-lg tracking-wide text-foreground">
            Gmail App Password
          </h2>
          {connection ? (
            <p className="font-ui text-sm text-muted-foreground">
              {connection.email} ·{" "}
              <span className="font-mono">
                {maskAppPassword(connection.app_password)}
              </span>
            </p>
          ) : (
            <p className="font-ui text-sm text-subtle-foreground">
              Not connected.
            </p>
          )}
        </div>

        <EnvelopeScanTester userId={userId} />

        {scanLog ? (
          <>
            <p className="mb-3 font-ui text-xs text-subtle-foreground">
              Last scan: {new Date(scanLog.scanned_at).toLocaleString("en-US")}
            </p>
            <div className="mb-6">
              <EmailListSection
                title="Emails initially looked at"
                description="Every candidate the IMAP purchase-keyword search surfaced this scan."
                emails={scanLog.candidates}
                createdFromMessageIds={createdFromMessageIds}
              />
            </div>
            <div className="mb-6">
              <EmailListSection
                title="Emails sent to the AI"
                description="The subset of candidates above that weren't already imported, sent to the AI provider for extraction."
                emails={scanLog.sent_to_ai}
                createdFromMessageIds={createdFromMessageIds}
              />
            </div>
          </>
        ) : (
          <p className="mb-6 font-ui text-sm text-subtle-foreground">
            No scan history yet.
          </p>
        )}

        <div className="mb-3">
          <ItemsSection
            title="Items created manually"
            description="Items this user added themselves."
            items={manualItems}
          />
        </div>
        <ItemsSection
          title="Items created from AI"
          description="Item cards produced from the emails above."
          items={aiItems}
          emailByMessageId={emailByMessageId}
        />
      </div>
    </div>
  );
}
