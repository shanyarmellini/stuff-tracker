import Link from "next/link";
import { createAdminClient } from "~/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Item = {
  id: string;
  user_id: string;
  price: number;
};

type GmailAppConnection = {
  user_id: string;
  email: string;
  app_password: string;
  updated_at: string;
};

type UserRecord = {
  id: string;
  email?: string;
  created_at: string;
};

// Never surface the raw app password in the UI - just enough of it (last 4
// chars) to confirm which credential is connected without the full 16-char
// secret sitting in an admin page (browser history, screenshots, etc.)
function maskAppPassword(password: string): string {
  const last4 = password.slice(-4);
  return `${"•".repeat(Math.max(password.length - 4, 4))}${last4}`;
}

export default async function AdminPage() {
  const supabase = createAdminClient();

  const [
    { data: usersData },
    { data: itemsData, error: itemsError },
    { data: connectionsData, error: connectionsError },
  ] = await Promise.all([
    supabase.auth.admin.listUsers(),
    supabase.from("items").select("id, user_id, price"),
    supabase
      .from("gmail_app_connections")
      .select("user_id, email, app_password, updated_at"),
  ]);

  if (itemsError) {
    console.error("Admin page failed to load items:", itemsError);
  }
  if (connectionsError) {
    console.error(
      "Admin page failed to load gmail app connections:",
      connectionsError,
    );
  }

  const users: UserRecord[] = usersData?.users ?? [];
  const items: Item[] = (itemsData as Item[]) ?? [];
  const connections: GmailAppConnection[] =
    (connectionsData as GmailAppConnection[]) ?? [];

  const itemsByUser = items.reduce<Record<string, Item[]>>((acc, item) => {
    if (!acc[item.user_id]) acc[item.user_id] = [];
    acc[item.user_id].push(item);
    return acc;
  }, {});

  const connectionByUser = connections.reduce<
    Record<string, GmailAppConnection>
  >((acc, conn) => {
    acc[conn.user_id] = conn;
    return acc;
  }, {});

  const joinedAt = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-sky-50 px-8 py-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-1 font-display text-4xl tracking-wide text-slate-800">
          Admin
        </h1>
        <p className="mb-8 font-ui text-sm text-slate-400">
          {users.length} {users.length === 1 ? "user" : "users"} total
        </p>

        <div className="flex flex-col gap-3">
          {users.map((user) => {
            const userItems = itemsByUser[user.id] ?? [];
            const totalSpent = userItems.reduce((s, i) => s + i.price, 0);
            const connection = connectionByUser[user.id];

            return (
              <Link
                key={user.id}
                href={`/admin/${user.id}`}
                className="flex items-center justify-between rounded-2xl border border-sky-100 bg-white px-6 py-4 shadow-sm transition-colors hover:border-sky-200"
              >
                <div>
                  <p className="font-ui text-sm font-medium text-slate-700">
                    {user.email ?? "—"}
                  </p>
                  <p className="font-ui text-xs text-slate-400">
                    Joined {joinedAt(user.created_at)}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span
                      className={
                        connection
                          ? "rounded-full bg-emerald-50 px-2 py-0.5 font-ui text-xs text-emerald-600"
                          : "rounded-full bg-slate-100 px-2 py-0.5 font-ui text-xs text-slate-400"
                      }
                    >
                      {connection
                        ? "Connected gmail app password"
                        : "Not connected"}
                    </span>
                    {connection && (
                      <span className="font-ui text-xs text-slate-400">
                        {connection.email} ·{" "}
                        <span className="font-mono">
                          {maskAppPassword(connection.app_password)}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-4 text-right">
                  <div>
                    <p className="font-ui text-xs uppercase tracking-widest text-slate-400">
                      Items
                    </p>
                    <p className="font-display text-lg tracking-wide text-slate-800">
                      {userItems.length}
                    </p>
                  </div>
                  <div>
                    <p className="font-ui text-xs uppercase tracking-widest text-slate-400">
                      Spent
                    </p>
                    <p className="font-display text-lg tracking-wide text-slate-800">
                      ${totalSpent.toFixed(2)}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
