import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/state/LanguageContext";
import { AppStateProvider } from "@/state/AppStateContext";
import { TerminalProvider } from "@/terminal/TerminalContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Miiiwa | Portfolio",
  description: "Miiiwaのポートフォリオサイト - 面白いを最優先！",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="bg-background text-foreground antialiased m-0 p-0">
        <AppStateProvider>
          <LanguageProvider>
            <TerminalProvider>
              {children}
            </TerminalProvider>
          </LanguageProvider>
        </AppStateProvider>
      </body>
    </html>
  );
}
