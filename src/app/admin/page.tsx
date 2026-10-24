import Link from "next/link";
import { formatPrice } from "~/lib/format";
import { createAdminClient } from "~/lib/supabase/admin";
import { cn } from "~/lib/utils";
import { formatJoinDate, listAllUsers, maskAppPassword } from "./_lib";

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
};

export default async function AdminPage() {
  const supabase = createAdminClient();

  const [
    users,
    { data: itemsData, error: itemsError },
    { data: connectionsData, error: connectionsError },
  ] = await Promise.all([
    listAllUsers(supabase),
    supabase.from("items").select("id, user_id, price"),
    supabase
      .from("gmail_app_connections")
      .select("user_id, email, app_password"),
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

  const itemsByUser = Map.groupBy(
    (itemsData as Item[] | null) ?? [],
    (item) => item.user_id,
  );
  const connectionByUser = new Map(
    ((connectionsData as GmailAppConnection[] | null) ?? []).map((conn) => [
      conn.user_id,
      conn,
    ]),
  );

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-muted px-8 py-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-1 font-display text-4xl tracking-wide text-foreground">
          Admin
        </h1>
        <p className="mb-8 font-ui text-sm text-subtle-foreground">
          {users.length} {users.length === 1 ? "user" : "users"} total
        </p>

        <div className="flex flex-col gap-3">
          {users.map((user) => {
            const userItems = itemsByUser.get(user.id) ?? [];
            const totalSpent = userItems.reduce((s, i) => s + i.price, 0);
            const connection = connectionByUser.get(user.id);

            return (
              <Link
                key={user.id}
                href={`/admin/${user.id}`}
                className="flex items-center justify-between rounded-2xl border border-border bg-card px-6 py-4 shadow-sm transition-colors hover:border-input"
              >
                <div>
                  <p className="font-ui text-sm font-medium text-foreground">
                    {user.email ?? "—"}
                  </p>
                  <p className="font-ui text-xs text-subtle-foreground">
                    Joined {formatJoinDate(user.created_at)}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 font-ui text-xs",
                        connection
                          ? "bg-success/10 text-success"
                          : "bg-muted text-subtle-foreground",
                      )}
                    >
                      {connection
                        ? "Connected gmail app password"
                        : "Not connected"}
                    </span>
                    {connection && (
                      <span className="font-ui text-xs text-subtle-foreground">
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
                    <p className="font-ui text-xs uppercase tracking-widest text-subtle-foreground">
                      Items
                    </p>
                    <p className="font-display text-lg tracking-wide text-foreground">
                      {userItems.length}
                    </p>
                  </div>
                  <div>
                    <p className="font-ui text-xs uppercase tracking-widest text-subtle-foreground">
                      Spent
                    </p>
                    <p className="font-display text-lg tracking-wide text-foreground">
                      {formatPrice(totalSpent)}
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
