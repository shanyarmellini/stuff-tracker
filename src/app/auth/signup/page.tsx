import { AuthPage } from "../auth-page";

export default function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  return <AuthPage mode="signup" searchParams={searchParams} />;
}
