import { AuthPage } from "../auth-page";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  return <AuthPage mode="login" searchParams={searchParams} />;
}
