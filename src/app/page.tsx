"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { GithubIcon, XIcon } from "@/components/icons";
import {
  SHEET_VARIANTS,
  exitDirectionFor,
  type ExitDirection,
} from "@/components/detailSheet";

// Each transparent spacer bracketing the detail page is exactly one viewport
// tall, which is what makes "the panel has left the screen" and "progress has
// reached 1" the same instant. At 1.5 there was a half-viewport dead zone where
// the panel was already gone but scrolling further still did nothing.
// Kept in sync with the h-screen classes on the two spacers below.
const SPACER_VH = 1;

// Fire slightly before the very end: momentum scrolling often stops a few
// pixels short, and with no further scroll events that would strand the user
// staring at the diorama with the panel still technically open.
const RETURN_HOME_AT = 0.98;

// Long enough to cover the open animation, short enough not to feel like the
// page is refusing to close.
const OPEN_SETTLE_MS = 450;

// Wait before throttling the render loop, so the sheet's slide and the camera's
// flight to the section both finish at full frame rate. Only once the panel has
// settled over the whole viewport is there nothing left to see.
const OBSCURE_DELAY_MS = 900;

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
  const { activeSection, setActiveSection, pageOpen, openPage, closePage, goHome } = useAppState();
  const { language, toggleLanguage } = useLanguage();
  const { openTerminal } = useTerminal();
  const isJa = language === "ja";

  const card = CARD[activeSection ?? "home"];
  const openedAt = useRef(0);
  const [toolsOpen, setToolsOpen] = useState(false);

  // The detail page is bracketed by two transparent spacers. Scrolling off
  // either end pulls the camera back to the diorama and then goes home.
  const scroller = useRef<HTMLDivElement | null>(null);
  const scrollReady = useRef(false);

  // Read by AnimatePresence at the moment the sheet is removed, so it has to
  // be set in the same update as goHome() — the exiting child itself is
  // rendered from cached props and would never see a later change.
  const [exitDirection, setExitDirection] = useState<ExitDirection>("down");

  // Whether the 3D canvas is completely hidden behind the detail page, and so
  // is safe to stop rendering. Deliberately not a per-frame value: it flips
  // only when the panel starts or stops covering the viewport.
  const [sceneObscured, setSceneObscured] = useState(false);
  const obscureTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setCovered = useCallback((covered: boolean) => {
    if (obscureTimer.current !== null) {
      clearTimeout(obscureTimer.current);
      obscureTimer.current = null;
    }
    if (!covered) {
      setSceneObscured(false);
      return;
    }
    obscureTimer.current = setTimeout(() => setSceneObscured(true), OBSCURE_DELAY_MS);
  }, []);

  useEffect(() => () => {
    if (obscureTimer.current !== null) clearTimeout(obscureTimer.current);
  }, []);

  /**
   * Dismiss the detail page. `resetCamera` separates the two intents: scrolling
   * off either end leaves the camera on the area just read about, while the
   * logo and HOME are a deliberate "take me back to the start" and fly to the
   * one fixed default view.
   */
  const closeToHome = (direction: ExitDirection, resetCamera: boolean) => {
    setExitDirection(direction);
    setCovered(false);
    if (resetCamera) goHome();
    else closePage();
  };

  const handleNav = (id: NonNullable<SectionType>) => {
    if (id === "about") {
      openPage(id);
    } else if (pageOpen) {
      setActiveSection(id);
    } else {
      openPage(id);
    }
  };

  useEffect(() => {
    if (!pageOpen) {
      scrollReady.current = false;
      return;
    }
    openedAt.current = Date.now();

    // Park the viewport on the panel so the spacer above it is reachable by
    // scrolling up. Runs while the sheet is still translated off-screen.
    scrollReady.current = false;
    if (scroller.current) {
      scroller.current.scrollTop = window.innerHeight * SPACER_VH;
    }
    // Ignore the scroll event the line above emits, which would otherwise
    // read as "scrolled all the way up" and bounce straight back home.
    const frame = requestAnimationFrame(() => {
      scrollReady.current = true;
      // Parked: the sheet now covers the whole viewport, so the canvas behind
      // it is about to become invisible.
      setCovered(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [pageOpen, activeSection, setCovered]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!scrollReady.current) return;

    const el = e.currentTarget;
    const spacer = window.innerHeight * SPACER_VH;
    const maxScroll = el.scrollHeight - el.clientHeight;

    // How far into either transparent spacer the reader has scrolled. Zero
    // means the panel still covers the viewport entirely.
    const upward = 1 - el.scrollTop / spacer;
    const downward = 1 - (maxScroll - el.scrollTop) / spacer;
    const progress = Math.max(0, Math.min(1, Math.max(upward, downward)));

    // Entering a spacer reveals the diorama again, so the render loop has to
    // come back up to speed before it is seen.
    setCovered(progress <= 0);

    if (progress >= RETURN_HOME_AT && Date.now() - openedAt.current > OPEN_SETTLE_MS) {
      closeToHome(exitDirectionFor(upward, downward), false);
    }
  };

  return (
    <main className="w-full h-screen overflow-hidden relative font-sans">
      {/* 3D scene fixed in the background */}
      <div className="fixed inset-0 w-full h-full -z-10 bg-[#fff3d1]">
        <Scene obscured={sceneObscured} />
      </div>

      {/* --- PERSISTENT CHROME (always visible in both modes) --- */}
      <div className="fixed inset-0 pointer-events-none z-40 flex flex-col justify-between p-7 sm:p-9">
        {/* Top bar */}
        <header className="flex justify-between items-start w-full gap-6">
          {/* Logo → full reset. Text only, no frame/icon. */}
          <button
            onClick={() => closeToHome("down", true)}
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

          {/* Floating About section for home screen */}
          <div className="absolute right-12 top-1/2 -translate-y-1/2 pointer-events-none z-30">
            <AnimatePresence>
              {!pageOpen && activeSection === "about" && <About />}
            </AnimatePresence>
          </div>

          {/* Footer (only on Home screen, bottom right) */}
          <div className="absolute bottom-9 right-12 pointer-events-auto">
            {!pageOpen && <Footer />}
          </div>
        </div>
      </div>

      {/* HOME button — zoomed into a building, page not yet open */}
      {activeSection && !pageOpen && (
        <button
          onClick={() => closeToHome("down", true)}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center gap-2 bg-white text-gray-800 font-bold py-3 px-7 rounded-full shadow-lg border border-black/5 hover:scale-105 transition-transform"
        >
          <X size={18} /> HOME
        </button>
      )}

      {/* --- PAGE CONTENT (detail reading) --- */}
      <AnimatePresence custom={exitDirection}>
        {pageOpen && activeSection && activeSection !== "about" && (
          <motion.div
            ref={scroller}
            custom={exitDirection}
            variants={SHEET_VARIANTS}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ type: "spring", stiffness: 280, damping: 34, mass: 0.9 }}
            className="fixed inset-0 z-20 overflow-y-auto pointer-events-auto"
            onScroll={handleScroll}
          >
            {/* Transparent spacer: scrolling up into it returns home */}
            <div className="h-screen pointer-events-none flex flex-col items-center justify-end pb-32">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-gray-900/40 font-bold tracking-[0.2em] text-sm animate-pulse flex flex-col items-center gap-4"
              >
                {isJa ? "スクロールでホームに戻ります" : "Scroll to return home"}
                <div className="w-[1px] h-12 bg-gradient-to-b from-transparent to-gray-900/40"></div>
              </motion.div>
            </div>

            <div className="bg-white pt-24 pb-24 min-h-screen flex flex-col shadow-2xl relative z-30">
              <div className="flex-grow">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeSection}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    {activeSection === "products" && <Products />}
                    {activeSection === "skills" && <Skills />}
                    {activeSection === "experience" && <Experience />}
                    {activeSection === "contact" && <Contact />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
            
            {/* Transparent spacer: scrolling down into it returns home */}
            <div className="h-screen pointer-events-none flex flex-col items-center justify-start pt-32">
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-gray-900/40 font-bold tracking-[0.2em] text-sm animate-pulse flex flex-col items-center gap-4"
              >
                <div className="w-[1px] h-12 bg-gradient-to-b from-gray-900/40 to-transparent"></div>
                {isJa ? "スクロールでホームに戻ります" : "Scroll to return home"}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Terminal easter egg */}
      <TerminalOverlay />
    </main>
  );
}
