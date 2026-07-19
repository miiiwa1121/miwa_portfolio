"use client";

import { useAppState, SectionType } from "@/components/AppStateContext";
import { useLanguage } from "@/components/LanguageContext";
import { useTerminal } from "@/components/TerminalContext";
import Scene from "@/components/3d/Scene";
import TerminalOverlay from "@/components/TerminalOverlay";
import About from "@/components/sections/About";
import Products from "@/components/sections/Products";
import Skills from "@/components/sections/Skills";
import Experience from "@/components/sections/Experience";
import Contact from "@/components/sections/Contact";
import Footer from "@/components/Footer";
import { Globe, ChevronRight, Terminal, X } from "lucide-react";

// lucide-react (v1) dropped brand glyphs, so GitHub / X use inline SVGs.
const GithubIcon = ({ size = 20 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>
);
const TwitterIcon = ({ size = 20 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" /></svg>
);

type NavItem = { id: NonNullable<SectionType>; ja: string; en: string };

const NAV: NavItem[] = [
  { id: "about", ja: "自己紹介", en: "About" },
  { id: "products", ja: "制作実績", en: "Products" },
  { id: "skills", ja: "技術スタック", en: "Skills" },
  { id: "experience", ja: "経歴・活動", en: "Experience" },
  { id: "contact", ja: "お問い合わせ", en: "Contact" },
];

// Contextual card copy — swaps as the camera flies to each building.
const CARD: Record<
  "home" | NonNullable<SectionType>,
  { jaTitle: string; enTitle: string; sub: string; ja: string; en: string; href: string }
> = {
  home: {
    jaTitle: "ようこそ",
    enTitle: "Welcome",
    sub: "Miiiwa's Portfolio",
    ja: "駆け出しの学生エンジニア（27卒）Miiiwaのポートフォリオです。ボクセルの街を歩き回って、気になる建物をクリックしてみてください。",
    en: "The portfolio of Miiiwa, a junior student engineer (Class of '27). Wander this voxel town and click a building to explore.",
    href: "#about",
  },
  about: {
    jaTitle: "自己紹介",
    enTitle: "About",
    sub: "About Me",
    ja: "「面白いを最優先！」がモットー。新規性を重視し、まだこの世にないものを探し求めている27卒の学生エンジニアです。",
    en: "My motto is \"Fun First!\" A Class-of-'27 student engineer who values novelty and searches for things that don't exist yet.",
    href: "#about",
  },
  products: {
    jaTitle: "制作実績",
    enTitle: "Products",
    sub: "Works",
    ja: "アイデアを形にしてきたプロダクトたち。ゲームからWebアプリまで、遊び心と技術を詰め込みました。",
    en: "Products where ideas took shape — from games to web apps, packed with playfulness and craft.",
    href: "#products",
  },
  skills: {
    jaTitle: "技術スタック",
    enTitle: "Skills",
    sub: "Tech Stack",
    ja: "フロントエンドを中心に、UXとデザインにこだわりながら日々新しい技術へ挑戦しています。",
    en: "Front-end focused, obsessed with UX and design, and always challenging new technology.",
    href: "#skills",
  },
  experience: {
    jaTitle: "経歴・活動",
    enTitle: "Experience",
    sub: "Journey",
    ja: "これまでの学び・挑戦・活動の記録。学生ながら幅広くものづくりに取り組んできました。",
    en: "A record of learning, challenges, and activity — a wide range of making, all while studying.",
    href: "#experience",
  },
  contact: {
    jaTitle: "お問い合わせ",
    enTitle: "Contact",
    sub: "Get in touch",
    ja: "お気軽にご連絡ください！SNSやフォームからいつでもどうぞ。",
    en: "Feel free to reach out — anytime via social links or the form.",
    href: "#contact",
  },
};

export default function Home() {
  const { activeSection, setActiveSection } = useAppState();
  const { language, toggleLanguage } = useLanguage();
  const { openTerminal } = useTerminal();
  const isJa = language === "ja";

  const card = CARD[activeSection ?? "home"];

  return (
    <main className="w-full relative min-h-screen font-sans">
      {/* 3D scene fixed in the background */}
      <div className="fixed inset-0 w-full h-full -z-10 bg-[#fff3d1]">
        <Scene />
      </div>

      {/* --- UI OVERLAY (Hero) --- */}
      <div className="fixed inset-0 pointer-events-none z-10 flex flex-col justify-between p-5 sm:p-6">
        {/* Top bar */}
        <header className="flex justify-between items-start w-full gap-4">
          {/* Logo + motto */}
          <div className="flex flex-col gap-2.5 pointer-events-auto">
            <button
              onClick={() => setActiveSection(null)}
              className="flex items-center gap-2.5 bg-white/85 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-sm border border-black/5 hover:scale-[1.03] transition-transform"
            >
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-pink-400 flex items-center justify-center font-black text-white shadow-inner">
                M
              </span>
              <span className="font-black text-gray-800 text-lg tracking-tight">
                Miiiwa<span className="text-orange-500">.</span>
              </span>
            </button>
            <div className="w-max bg-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-[0_3px_0_#c2410c]">
              {isJa ? "面白いを最優先！" : "Fun First!"}
            </div>
          </div>

          {/* Top-right nav + tools */}
          <div className="flex items-center gap-3">
            <nav className="hidden lg:flex gap-1 pointer-events-auto bg-white/85 backdrop-blur-md px-2 py-2 rounded-full shadow-sm border border-black/5">
              {NAV.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-bold transition-colors ${
                    activeSection === item.id
                      ? "bg-orange-500 text-white"
                      : "text-gray-700 hover:text-orange-500 hover:bg-orange-50"
                  }`}
                >
                  {isJa ? item.ja : item.en}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                onClick={openTerminal}
                title="Terminal mode"
                className="w-11 h-11 bg-white/85 backdrop-blur-md rounded-full flex items-center justify-center text-green-600 shadow-sm hover:scale-110 transition-transform border border-black/5"
              >
                <Terminal size={20} />
              </button>
              <button
                onClick={toggleLanguage}
                title="Toggle language"
                className="h-11 px-3 bg-white/85 backdrop-blur-md rounded-full flex items-center gap-1.5 text-gray-800 shadow-sm hover:scale-105 transition-transform border border-black/5"
              >
                <Globe size={18} className="text-orange-500" />
                <span className="text-xs font-black w-5">{isJa ? "JP" : "EN"}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Middle: contextual card */}
        <div className="flex-1 flex items-center w-full relative">
          <div
            key={activeSection ?? "home"}
            className="pointer-events-auto bg-white/95 backdrop-blur-sm rounded-3xl p-6 sm:p-8 shadow-xl max-w-xs sm:max-w-sm border border-black/5 animate-[fadeIn_0.4s_ease]"
          >
            <p className="text-orange-500 font-black text-lg">{isJa ? card.jaTitle : card.enTitle}</p>
            <p className="text-xs text-gray-400 font-bold mb-4 uppercase tracking-[0.2em]">{card.sub}</p>
            <p className="text-gray-700 font-medium mb-6 leading-relaxed text-sm">{isJa ? card.ja : card.en}</p>
            <a
              href={card.href}
              className="inline-flex bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-7 rounded-full shadow-[0_4px_0_#c2410c] active:shadow-[0_0px_0_#c2410c] active:translate-y-1 transition-all items-center gap-1.5"
            >
              {isJa ? "詳しく見る" : "More"} <ChevronRight size={18} />
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex justify-between items-end w-full gap-4">
          {/* Social */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <a
              href="https://github.com/miiiwa1121"
              target="_blank"
              rel="noopener noreferrer"
              className="w-11 h-11 bg-white/85 backdrop-blur-md rounded-full flex items-center justify-center text-gray-800 shadow-sm hover:scale-110 transition-transform border border-black/5"
            >
              <GithubIcon size={20} />
            </a>
            <a
              href="https://x.com/miiiwa3330"
              target="_blank"
              rel="noopener noreferrer"
              className="w-11 h-11 bg-white/85 backdrop-blur-md rounded-full flex items-center justify-center text-gray-800 shadow-sm hover:scale-110 transition-transform border border-black/5"
            >
              <TwitterIcon size={20} />
            </a>
          </div>

          {/* Hint */}
          <div className="hidden sm:block pointer-events-none text-center text-gray-500 text-xs font-bold bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full">
            {isJa ? "建物をクリックして探索 ・ 下にスクロールで詳細" : "Click a building to explore · scroll down for details"}
          </div>

          {/* spacer to balance flex */}
          <div className="w-[104px]" />
        </div>
      </div>

      {/* HOME button — only while a section is focused */}
      {activeSection && (
        <button
          onClick={() => setActiveSection(null)}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-auto flex items-center gap-2 bg-white text-gray-800 font-bold py-3 px-7 rounded-full shadow-lg border border-black/5 hover:scale-105 transition-transform"
        >
          <X size={18} /> HOME
        </button>
      )}

      {/* Spacer so the 3D scene acts as the hero */}
      <div className="w-full h-[100svh] pointer-events-none" />

      {/* Scrolling content overlaying the scene */}
      <div className="relative z-20 bg-white border-t-4 border-gray-100 shadow-[0_-20px_50px_rgba(0,0,0,0.1)] pb-20">
        <About />
        <Products />
        <Skills />
        <Experience />
        <Contact />
        <Footer />
      </div>

      {/* Terminal easter egg */}
      <TerminalOverlay />
    </main>
  );
}
