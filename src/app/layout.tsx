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
  metadataBase: new URL("https://miiiwa.com"),
  title: {
    default: "Miiiwa | Portfolio - 面白いを最優先！",
    template: "%s | Miiiwa Portfolio",
  },
  description: "エンジニアMiiiwaのポートフォリオサイト。「面白いを最優先！」をモットーに、Webサービスやブラウザゲーム、3Dグラフィックスを開発しています。",
  keywords: ["Miiiwa", "ポートフォリオ", "エンジニア", "Web開発", "Next.js", "Three.js", "Michaw", "見ちゃう"],
  authors: [{ name: "Miiiwa", url: "https://miiiwa.com" }],
  creator: "Miiiwa",
  alternates: {
    canonical: "https://miiiwa.com",
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: "https://miiiwa.com",
    siteName: "Miiiwa Portfolio",
    title: "Miiiwa | Portfolio - 面白いを最優先！",
    description: "エンジニアMiiiwaのポートフォリオサイト。「面白いを最優先！」をモットーに、Webサービスやブラウザゲーム、3Dグラフィックスを開発しています。",
  },
  twitter: {
    card: "summary_large_image",
    title: "Miiiwa | Portfolio - 面白いを最優先！",
    description: "エンジニアMiiiwaのポートフォリオサイト。「面白いを最優先！」をモットーに、Webサービスやブラウザゲーム、3Dグラフィックスを開発しています。",
    creator: "@miiiwa3330",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

// userScalable: false — without it, a two-finger gesture over the planet
// zooms the whole page (the browser's native pinch-zoom) rather than
// reaching Scene.tsx's own pinch handler, which drives the free orbit's
// near/far altitude instead. See Hub.tsx's touch-none on the canvas div for
// the other half of the same fix.
//
// viewportFit: "cover" — the page is drawn behind the notch and the home
// indicator, which is what makes `env(safe-area-inset-*)` report anything
// but 0 on iOS. The `.safe-inset` wrapper in globals.css is the other half:
// covering without insetting the chrome would put the header under the notch.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
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
