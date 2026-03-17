import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AppLayout } from "@/components/sidebar";
import { GlobalSearch } from "@/components/global-search";
import { CurrencyProvider } from "@/components/currency-provider";
import { AuthSessionProvider } from "@/components/session-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SMM Price Compare",
  description: "Compare SMM panel prices across providers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className="dark">
      <body className={inter.className}>
        <AuthSessionProvider>
          <CurrencyProvider>
            <AppLayout>{children}</AppLayout>
            <GlobalSearch />
          </CurrencyProvider>
        </AuthSessionProvider>
        <Toaster />
      </body>
    </html>
  );
}
