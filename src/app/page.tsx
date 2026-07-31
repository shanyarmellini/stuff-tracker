import { LandingDemo } from "./landing-demo";
import { WaitlistCta } from "./waitlist-cta";

export default async function Home() {
  return (
    <main className="relative flex min-h-[calc(100vh-3.5rem)] items-center justify-center overflow-hidden bg-sky-50 p-4 sm:p-8">
      <div className="relative z-10 flex max-w-2xl flex-col items-center gap-8 px-6 py-16 text-center">
        <h1 className="max-w-2xl font-display text-4xl leading-tight tracking-wide text-slate-800 sm:text-6xl">
          Online inventory created by AI in seconds
        </h1>
        <LandingDemo />
        <p className="max-w-md font-ui text-base text-slate-500 sm:text-lg">
          Stuff Tracker reads your order confirmations and lets AI build a
          living inventory of everything you&apos;ve bought — so you always know
          what&apos;s already yours before you buy it again.
        </p>
        <WaitlistCta />
      </div>
    </main>
  );
}
