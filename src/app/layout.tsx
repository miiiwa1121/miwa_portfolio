import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AnimatedBackground from "@/components/AnimatedBackground";
import InteractiveParticles from "@/components/InteractiveParticles";
import { TerminalProvider } from "@/components/TerminalContext";
import TerminalOverlay from "@/components/TerminalOverlay";

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
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col relative">
        <TerminalProvider>
          <AnimatedBackground />
          <InteractiveParticles />
          <Header />
          <main className="flex-1 relative z-10 pt-16">
            {children}
          </main>
          <Footer />
          <TerminalOverlay />
        </TerminalProvider>
      </body>
    </html>
  );
}
