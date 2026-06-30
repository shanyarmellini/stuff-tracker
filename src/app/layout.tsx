import type { Metadata } from "next";
import { Inter, Patrick_Hand_SC, Poppins } from "next/font/google";
import { Navbar } from "~/components/navbar";
import { createClient } from "~/lib/supabase/server";
import { ThemeProvider } from "./theme-provider";
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${patrickHandSC.variable} ${poppins.variable} font-sans`}
      >
        <ThemeProvider>
          <Navbar user={user} />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
