import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "~/lib/supabase/admin";

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

type Item = {
  id: string;
  name: string;
  price: number;
  gmail_message_id: string | null;
  source: string;
  created_at: string;
};

type GmailAppConnection = {
  email: string;
  app_password: string;
};

// Never surface the raw app password in the UI - see admin/page.tsx.
function maskAppPassword(password: string): string {
  const last4 = password.slice(-4);
  return `${"•".repeat(Math.max(password.length - 4, 4))}${last4}`;
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
    <div className="rounded-2xl border border-sky-100 bg-white shadow-sm">
      <div className="border-b border-sky-50 px-6 py-4">
        <h2 className="font-display text-lg tracking-wide text-slate-800">
          {title}
        </h2>
        <p className="font-ui text-xs text-slate-400">{description}</p>
      </div>
      {emails.length === 0 ? (
        <p className="px-6 py-4 font-ui text-sm text-slate-400">None.</p>
      ) : (
        <ul className="divide-y divide-sky-50">
          {emails.map((email) => (
            <li key={email.message_id} className="px-6 py-3">
              <details>
                <summary className="cursor-pointer font-ui text-sm text-slate-700">
                  <span className="font-medium">
                    {email.subject || "(no subject)"}
                  </span>{" "}
                  <span className="text-slate-400">— {email.from}</span>
                  {createdFromMessageIds?.has(email.message_id) && (
                    <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 font-ui text-xs text-emerald-600">
                      created an item
                    </span>
                  )}
                </summary>
                <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-600">
                  {email.body_text || "(empty body)"}
                </pre>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
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
      .select("id, name, price, gmail_message_id, source, created_at")
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
  const createdFromMessageIds = new Set(
    aiItems
      .map((item) => item.gmail_message_id)
      .filter((id): id is string => Boolean(id)),
  );

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-sky-50 px-8 py-10">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/admin"
          className="mb-4 inline-block font-ui text-sm text-sky-500 hover:text-sky-600"
        >
          ← Back to all users
        </Link>

        <h1 className="mb-1 font-display text-4xl tracking-wide text-slate-800">
          {user.email ?? "—"}
        </h1>
        <p className="mb-8 font-ui text-sm text-slate-400">
          Joined{" "}
          {new Date(user.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>

        <div className="mb-6 rounded-2xl border border-sky-100 bg-white px-6 py-4 shadow-sm">
          <h2 className="mb-1 font-display text-lg tracking-wide text-slate-800">
            Gmail App Password
          </h2>
          {connection ? (
            <p className="font-ui text-sm text-slate-600">
              {connection.email} ·{" "}
              <span className="font-mono">
                {maskAppPassword(connection.app_password)}
              </span>
            </p>
          ) : (
            <p className="font-ui text-sm text-slate-400">Not connected.</p>
          )}
        </div>

        {scanLog ? (
          <>
            <p className="mb-3 font-ui text-xs text-slate-400">
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
                description="The subset of candidates above that weren't already imported, sent to Claude for extraction."
                emails={scanLog.sent_to_ai}
                createdFromMessageIds={createdFromMessageIds}
              />
            </div>
          </>
        ) : (
          <p className="mb-6 font-ui text-sm text-slate-400">
            No scan history yet.
          </p>
        )}

        <div className="rounded-2xl border border-sky-100 bg-white shadow-sm">
          <div className="border-b border-sky-50 px-6 py-4">
            <h2 className="font-display text-lg tracking-wide text-slate-800">
              Items created from AI
            </h2>
            <p className="font-ui text-xs text-slate-400">
              Item cards produced from the emails above.
            </p>
          </div>
          {aiItems.length === 0 ? (
            <p className="px-6 py-4 font-ui text-sm text-slate-400">
              None yet.
            </p>
          ) : (
            <ul className="divide-y divide-sky-50">
              {aiItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between px-6 py-3"
                >
                  <p className="font-ui text-sm text-slate-700">{item.name}</p>
                  <p className="font-ui text-sm font-semibold text-slate-700">
                    ${item.price.toFixed(2)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
