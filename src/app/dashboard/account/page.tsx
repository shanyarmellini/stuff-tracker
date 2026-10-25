"use client";

import { useEffect, useState } from "react";
import { SECTION_CARD_CLASS } from "~/components/class-names";
import { SignOutButton } from "~/components/sign-out-button";
import { LoadingText, SubPageShell } from "~/components/sub-page-shell";
import { formatDate } from "~/lib/format";
import { createClient } from "~/lib/supabase/client";

const CARD_LABEL_CLASS =
  "mb-2 font-ui text-xs uppercase tracking-widest text-subtle-foreground";

export default function AccountPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | undefined>(undefined);
  const [itemTypes, setItemTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setEmail(user.email ?? null);
        setCreatedAt(user.created_at);
        const { data: profile } = await supabase
          .from("profiles")
          .select("item_types")
          .eq("user_id", user.id)
          .single();
        setItemTypes(profile?.item_types ?? []);
      }
      setLoading(false);
    });
  }, []);

  return (
    <SubPageShell title="Account" subtitle="Your account details.">
      {loading ? (
        <LoadingText />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand/15 font-display text-2xl text-brand-strong">
              {email ? email.charAt(0).toUpperCase() : "?"}
            </div>
            <div className="min-w-0">
              <p className="truncate font-ui text-sm font-semibold text-foreground">
                {email ?? "No email on file"}
              </p>
              <p className="font-ui text-xs text-subtle-foreground">
                Member since {formatDate(createdAt)}
              </p>
            </div>
          </div>

          {itemTypes.length > 0 && (
            <div className={SECTION_CARD_CLASS}>
              <p className={CARD_LABEL_CLASS}>Things you track</p>
              <div className="flex flex-wrap gap-2">
                {itemTypes.map((type) => (
                  <span
                    key={type}
                    className="rounded-full border border-input bg-muted px-3 py-1 font-ui text-xs text-brand-strong"
                  >
                    {type}
                  </span>
                ))}
              </div>
            </div>
          )}

          <SignOutButton variant="card">Log out</SignOutButton>
        </div>
      )}
    </SubPageShell>
  );
}
