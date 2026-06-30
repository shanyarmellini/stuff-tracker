import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Navbar } from "~/components/navbar";
import { createClient } from "~/lib/supabase/server";
import { ThemeProvider } from "./theme-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lumos App",
  description: "Built with create-lumos-app",
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
      <body className={inter.className}>
        <ThemeProvider>
          <Navbar user={user} />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
