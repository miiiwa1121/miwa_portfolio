import type { Metadata, Viewport } from "next";
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

// userScalable: false — without it, a two-finger gesture over the planet
// zooms the whole page (the browser's native pinch-zoom) rather than
// reaching Scene.tsx's own pinch handler, which drives the free orbit's
// near/far altitude instead. See Hub.tsx's touch-none on the canvas div for
// the other half of the same fix.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3824645900927410"
          crossOrigin="anonymous"
        />
      </head>
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
