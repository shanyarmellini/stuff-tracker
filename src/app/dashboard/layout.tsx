import { redirect } from "next/navigation";
import { hasCompletedOnboarding } from "~/app/onboarding/onboarding-status";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await hasCompletedOnboarding())) redirect("/onboarding");
  return <>{children}</>;
}
