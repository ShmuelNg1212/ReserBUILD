import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { AppHeader } from "@/components/app-header";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "ReserBUILD", template: "%s · ReserBUILD" },
  description: "Book campus spaces, see the price, and pay ahead.",
};

export const viewport: Viewport = { themeColor: "#ffffff", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-PH" className={`${geist.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:m-2 focus:rounded focus:bg-ink focus:px-3 focus:py-2 focus:text-paper">
          Skip to content
        </a>
        <AppHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
      </body>
    </html>
  );
}
