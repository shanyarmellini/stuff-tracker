import { createAdminClient } from "~/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Item = {
  id: string;
  user_id: string;
  name: string;
  price: number;
  link: string | null;
  photo_url: string | null;
  created_at: string;
};

type UserRecord = {
  id: string;
  email?: string;
  created_at: string;
};

function ExternalLinkIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}

function linkHostname(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(
      url.startsWith("http") ? url : `https://${url}`,
    ).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

export default async function AdminPage() {
  const supabase = createAdminClient();

  const [{ data: usersData }, { data: itemsData, error: itemsError }] =
    await Promise.all([
      supabase.auth.admin.listUsers(),
      supabase
        .from("items")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

  if (itemsError) {
    console.error("Admin page failed to load items:", itemsError);
  }

  const users: UserRecord[] = usersData?.users ?? [];
  const items: Item[] = (itemsData as Item[]) ?? [];

  const itemsByUser = items.reduce<Record<string, Item[]>>((acc, item) => {
    if (!acc[item.user_id]) acc[item.user_id] = [];
    acc[item.user_id].push(item);
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

        <div className="flex flex-col gap-5">
          {users.map((user) => {
            const userItems = itemsByUser[user.id] ?? [];
            const totalSpent = userItems.reduce((s, i) => s + i.price, 0);

            return (
              <div
                key={user.id}
                className="rounded-2xl border border-sky-100 bg-white shadow-sm"
              >
                {/* User header */}
                <div className="flex items-center justify-between border-b border-sky-50 px-6 py-4">
                  <div>
                    <p className="font-ui text-sm font-medium text-slate-700">
                      {user.email ?? "—"}
                    </p>
                    <p className="font-ui text-xs text-slate-400">
                      Joined {joinedAt(user.created_at)}
                    </p>
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
                </div>

                {/* Items list */}
                {userItems.length === 0 ? (
                  <p className="px-6 py-4 font-ui text-sm text-slate-400">
                    No items yet.
                  </p>
                ) : (
                  <ul className="divide-y divide-sky-50">
                    {userItems.map((item) => {
                      const hostname = linkHostname(item.link);
                      return (
                        <li
                          key={item.id}
                          className="flex items-center justify-between px-6 py-3"
                        >
                          <p className="font-ui text-sm text-slate-700">
                            {item.name}
                          </p>
                          <div className="flex items-center gap-4">
                            {hostname && item.link && (
                              <a
                                href={
                                  item.link.startsWith("http")
                                    ? item.link
                                    : `https://${item.link}`
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 font-ui text-xs text-sky-400 transition-colors hover:text-sky-500"
                              >
                                {hostname}
                                <ExternalLinkIcon />
                              </a>
                            )}
                            <p className="font-ui text-sm font-semibold text-slate-700">
                              ${item.price.toFixed(2)}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
