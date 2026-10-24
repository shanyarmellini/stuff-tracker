import { redirect } from "next/navigation";
import { isAdmin } from "~/lib/auth";
import { getCurrentUser } from "~/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getCurrentUser();
  if (!isAdmin(user)) redirect("/dashboard");
  return <>{children}</>;
}
