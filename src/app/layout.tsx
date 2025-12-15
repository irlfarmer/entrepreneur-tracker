import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./printing.css";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import SessionProvider from "@/components/SessionProvider";
import { BusinessProvider } from "@/context/BusinessContext";
import { ModalProvider } from "@/context/ModalContext";
import GlobalModal from "@/components/ui/GlobalModal";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Entrepreneur Sales & Inventory Tracker",
  description: "Beautiful, simple sales and inventory tracking for entrepreneurs",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider session={session}>
          <BusinessProvider>
            <ModalProvider>
              {children}
              <GlobalModal />
            </ModalProvider>
          </BusinessProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
