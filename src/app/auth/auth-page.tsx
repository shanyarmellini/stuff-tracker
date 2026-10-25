import { login, signup } from "~/app/auth/actions";
import { AuthForm, type AuthFormConfig } from "./auth-form";

const MODES = {
  login: {
    title: "Sign in",
    subtitle: "Enter your email and password to continue",
    form: {
      action: login,
      submitLabel: "Sign in",
      passwordAutoComplete: "current-password",
      switchPrompt: "Not on the list yet?",
      switchHref: "/",
      switchLabel: "Join the waitlist",
    },
  },
  signup: {
    title: "Create an account",
    subtitle: "Enter your email and password to get started",
    form: {
      action: signup,
      submitLabel: "Create account",
      passwordAutoComplete: "new-password",
      switchPrompt: "Already have an account?",
      switchHref: "/auth/login",
      switchLabel: "Sign in",
    },
  },
} satisfies Record<
  string,
  { title: string; subtitle: string; form: AuthFormConfig }
>;

/** Shared page for /auth/login and /auth/signup. */
export async function AuthPage({
  mode,
  searchParams,
}: {
  mode: keyof typeof MODES;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  const { title, subtitle, form } = MODES[mode];

  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <AuthForm config={form} error={error} message={message} />
      </div>
    </main>
  );
}
