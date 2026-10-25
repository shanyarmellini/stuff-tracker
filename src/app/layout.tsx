import type { Metadata } from "next";
import { Inter, Patrick_Hand_SC, Poppins } from "next/font/google";
import { Navbar } from "~/components/navbar";
import { env } from "~/env";
import { isBlockedByWaitlist } from "~/lib/early-access";
import { getCurrentUser } from "~/lib/supabase/server";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const patrickHandSC = Patrick_Hand_SC({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-patrick-hand-sc",
});

const poppins = Poppins({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Stuff Tracker",
  description:
    "Track ALL your purchases and sit back and watch as AI organizes them in seconds!",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getCurrentUser();

  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${patrickHandSC.variable} ${poppins.variable} font-sans`}
      >
        <Navbar
          user={user}
          hasAccess={!!user && !isBlockedByWaitlist(user)}
          isDev={env.NODE_ENV !== "production"}
        />
        {children}
      </body>
    </html>
  );
}
