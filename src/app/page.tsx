"use client";

import { useEffect, useRef, useState } from "react";
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
import { Globe, ChevronRight, Terminal, X, Monitor } from "lucide-react";

// lucide-react (v1) dropped brand glyphs, so GitHub / X use inline SVGs.
const GithubIcon = ({ size = 20 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>
);
// The X (formerly Twitter) logo.
const XIcon = ({ size = 18 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
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
  { jaTitle: string; enTitle: string; sub: string; ja: string; en: string }
> = {
  home: {
    jaTitle: "ようこそ",
    enTitle: "Welcome",
    sub: "Miiiwa's Portfolio",
    ja: "駆け出しの学生エンジニア（27卒）Miiiwaのポートフォリオです。ボクセルの街をぐるっと眺めて、気になる建物をクリックしてみてください。",
    en: "The portfolio of Miiiwa, a junior student engineer (Class of '27). Look around this voxel town and click a building to explore.",
  },
  about: {
    jaTitle: "自己紹介",
    enTitle: "About",
    sub: "About Me",
    ja: "「面白いを最優先！」がモットー。新規性を重視し、まだこの世にないものを探し求めている27卒の学生エンジニアです。",
    en: "My motto is \"Fun First!\" A Class-of-'27 student engineer who values novelty and searches for things that don't exist yet.",
  },
  products: {
    jaTitle: "制作実績",
    enTitle: "Products",
    sub: "Works",
    ja: "アイデアを形にしてきたプロダクトたち。ゲームからWebアプリまで、遊び心と技術を詰め込みました。",
    en: "Products where ideas took shape — from games to web apps, packed with playfulness and craft.",
  },
  skills: {
    jaTitle: "技術スタック",
    enTitle: "Skills",
    sub: "Tech Stack",
    ja: "フロントエンドを中心に、UXとデザインにこだわりながら日々新しい技術へ挑戦しています。",
    en: "Front-end focused, obsessed with UX and design, and always challenging new technology.",
  },
  experience: {
    jaTitle: "経歴・活動",
    enTitle: "Experience",
    sub: "Journey",
    ja: "これまでの学び・挑戦・活動の記録。学生ながら幅広くものづくりに取り組んできました。",
    en: "A record of learning, challenges, and activity — a wide range of making, all while studying.",
  },
  contact: {
    jaTitle: "お問い合わせ",
    enTitle: "Contact",
    sub: "Get in touch",
    ja: "お気軽にご連絡ください！SNSやフォームからいつでもどうぞ。",
    en: "Feel free to reach out — anytime via social links or the form.",
  },
};

export default function Home() {
  const { activeSection, setActiveSection, pageOpen, openPage, goHome } = useAppState();
  const { language, toggleLanguage } = useLanguage();
  const { openTerminal } = useTerminal();
  const isJa = language === "ja";

  const card = CARD[activeSection ?? "home"];
  const openedAt = useRef(0);
  const [toolsOpen, setToolsOpen] = useState(false);

  const scrollToSection = (id: NonNullable<SectionType>, smooth = true) => {
    document.getElementById(id)?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  };

  // Nav tabs: open the page (orbit mode) or jump between sections (page mode).
  const handleNav = (id: NonNullable<SectionType>) => {
    if (pageOpen) {
      setActiveSection(id);
      scrollToSection(id, true);
    } else {
      openPage(id);
    }
  };

  // When the page opens, jump to the focused section. When it closes, we're back
  // in orbit mode. Also arm the "scrolled to the bottom → return home" watcher.
  useEffect(() => {
    if (!pageOpen) return;
    openedAt.current = Date.now();
    const target = activeSection ?? "about";
    requestAnimationFrame(() =>
      requestAnimationFrame(() => scrollToSection(target, false))
    );
  }, [pageOpen, activeSection]);

  // Reaching the very bottom of the page returns to the diorama.
  useEffect(() => {
    if (!pageOpen) return;
    const onScroll = () => {
      if (Date.now() - openedAt.current < 1200) return; // ignore the open jump
      const atBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 4;
      if (atBottom) goHome();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pageOpen, goHome]);

  return (
    <main className="w-full relative min-h-screen font-sans" style={{ touchAction: pageOpen ? "auto" : "none" }}>
      {/* 3D scene fixed in the background */}
      <div className="fixed inset-0 w-full h-full -z-10 bg-[#fff3d1]">
        <Scene />
      </div>

      {/* --- PERSISTENT CHROME (always visible in both modes) --- */}
      <div className="fixed inset-0 pointer-events-none z-40 flex flex-col justify-between p-5 sm:p-6">
        {/* Top bar */}
        <header className="flex justify-between items-start w-full gap-6 pt-2 sm:pt-3">
          {/* Logo → full reset. Text only, no frame/icon. */}
          <button
            onClick={goHome}
            className="pointer-events-auto font-black text-gray-900 text-4xl sm:text-5xl tracking-tight hover:scale-[1.04] transition-transform [text-shadow:0_1px_5px_rgba(255,255,255,0.7)]"
          >
            Miiiwa<span className="text-orange-500">.</span>
          </button>

          {/* Nav + language */}
          <div className="flex items-center gap-4">
            <nav className="hidden lg:flex gap-2 pointer-events-auto bg-white/85 backdrop-blur-md px-3 py-3 rounded-full shadow-sm border border-black/5">
              {NAV.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`px-5 py-2.5 rounded-full text-lg font-bold transition-colors ${
                    activeSection === item.id
                      ? "bg-orange-500 text-white"
                      : "text-gray-700 hover:text-orange-500 hover:bg-orange-50"
                  }`}
                >
                  {isJa ? item.ja : item.en}
                </button>
              ))}
            </nav>

            <button
              onClick={toggleLanguage}
              title="Toggle language"
              className="h-14 px-4 bg-white/85 backdrop-blur-md rounded-full flex items-center gap-2 text-gray-800 shadow-sm hover:scale-105 transition-transform border border-black/5 pointer-events-auto"
            >
              <Globe size={22} className="text-orange-500" />
              <span className="text-sm font-black w-6">{isJa ? "JP" : "EN"}</span>
            </button>
          </div>
        </header>

        {/* Middle: contextual card (orbit mode only) */}
        <div className="flex-1 flex items-center w-full">
          {!pageOpen && (
            <div
              key={activeSection ?? "home"}
              className="pointer-events-auto bg-white/95 backdrop-blur-sm rounded-3xl p-6 sm:p-8 shadow-xl max-w-xs sm:max-w-sm border border-black/5 animate-[fadeIn_0.4s_ease]"
            >
              <p className="text-orange-500 font-black text-lg">{isJa ? card.jaTitle : card.enTitle}</p>
              <p className="text-xs text-gray-400 font-bold mb-4 uppercase tracking-[0.2em]">{card.sub}</p>
              <p className="text-gray-700 font-medium mb-6 leading-relaxed text-sm">{isJa ? card.ja : card.en}</p>
              <button
                onClick={() => openPage(activeSection ?? "about")}
                className="inline-flex bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-7 rounded-full shadow-[0_4px_0_#c2410c] active:shadow-[0_0px_0_#c2410c] active:translate-y-1 transition-all items-center gap-1.5"
              >
                {isJa ? "詳しく見る" : "More"} <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="flex justify-between items-end w-full gap-4">
          {/* Links tucked behind a PC icon — revealed on hover (or tap) */}
          <div
            className="flex items-center pointer-events-auto"
            onMouseEnter={() => setToolsOpen(true)}
            onMouseLeave={() => setToolsOpen(false)}
          >
            <button
              onClick={() => setToolsOpen((o) => !o)}
              title={isJa ? "リンク" : "Links"}
              aria-expanded={toolsOpen}
              className={`w-11 h-11 rounded-full flex items-center justify-center shadow-sm hover:scale-110 transition-all border border-black/5 ${
                toolsOpen ? "bg-orange-500 text-white" : "bg-white/85 backdrop-blur-md text-gray-800"
              }`}
            >
              <Monitor size={20} />
            </button>
            {toolsOpen && (
              <div className="flex items-center gap-2 ml-2 animate-[fadeIn_0.25s_ease]">
                <a
                  href="https://github.com/miiiwa1121"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="GitHub"
                  className="w-11 h-11 bg-white/85 backdrop-blur-md rounded-full flex items-center justify-center text-gray-800 shadow-sm hover:scale-110 transition-transform border border-black/5 shrink-0"
                >
                  <GithubIcon size={20} />
                </a>
                <a
                  href="https://x.com/miiiwa3330"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="X"
                  className="w-11 h-11 bg-white/85 backdrop-blur-md rounded-full flex items-center justify-center text-gray-900 shadow-sm hover:scale-110 transition-transform border border-black/5 shrink-0"
                >
                  <XIcon size={18} />
                </a>
                <button
                  onClick={openTerminal}
                  title="Terminal mode"
                  className="w-11 h-11 bg-white/85 backdrop-blur-md rounded-full flex items-center justify-center text-green-600 shadow-sm hover:scale-110 transition-transform border border-black/5 shrink-0"
                >
                  <Terminal size={20} />
                </button>
              </div>
            )}
          </div>

          {/* spacer to balance flex */}
          <div className="w-[104px]" />
        </div>
      </div>

      {/* HOME button — zoomed into a building, page not yet open */}
      {activeSection && !pageOpen && (
        <button
          onClick={goHome}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center gap-2 bg-white text-gray-800 font-bold py-3 px-7 rounded-full shadow-lg border border-black/5 hover:scale-105 transition-transform"
        >
          <X size={18} /> HOME
        </button>
      )}

      {/* --- PAGE CONTENT (detail reading) --- */}
      {pageOpen && (
        <div className="relative z-20 bg-white pt-24 pb-24">
          <About />
          <Products />
          <Skills />
          <Experience />
          <Contact />
          <Footer />
          <p className="text-center text-gray-400 text-sm pt-10 pb-4">
            {isJa ? "▲ ここまで。スクロールで3Dの街へ戻ります" : "▲ The end — scroll to return to the 3D town"}
          </p>
        </div>
      )}

      {/* Terminal easter egg */}
      <TerminalOverlay />
    </main>
  );
}
