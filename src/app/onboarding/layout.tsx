import { redirect } from "next/navigation";
import { hasCompletedOnboarding } from "./onboarding-status";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (await hasCompletedOnboarding()) redirect("/dashboard");
  return <>{children}</>;
}
