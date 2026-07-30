"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppState, SectionType } from "@/state/AppStateContext";
import { useLanguage } from "@/state/LanguageContext";
import { useTerminal } from "@/terminal/TerminalContext";
import Scene from "@/scene/Scene";
import TerminalOverlay from "@/terminal/TerminalOverlay";
import About from "@/hub/about/About";
import Products from "@/detail/Products";
import Skills from "@/detail/Skills";
import Experience from "@/detail/Experience";
import Contact from "@/detail/Contact";
import Footer from "@/hub/Footer";
import { Globe, Terminal, X, Monitor, Pause, Play } from "lucide-react";
import { GithubIcon, XIcon } from "@/ui/icons";
import CardLeaderLine from "@/hub/CardLeaderLine";
import AreaCard from "@/hub/AreaCard";
import { adjacentSection, facingSection, HOME_ANGLE } from "@/scene/worldLayout";
import {
  SHEET_VARIANTS,
  exitDirectionFor,
  type ExitDirection,
} from "@/detail/detailSheet";

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

export default function Home() {
  const { activeSection, setActiveSection, pageOpen, openPage, closePage, goHome, facing, setFacing, turnTo, paused, togglePaused } = useAppState();
  const { language, toggleLanguage } = useLanguage();
  const { openTerminal } = useTerminal();
  const isJa = language === "ja";

  // Which area the card is about. With no section explicitly focused it is
  // whatever the camera is turned towards, so rotating the diorama leafs
  // through the areas.
  const card = activeSection ?? facing;
  const openedAt = useRef(0);
  const [toolsOpen, setToolsOpen] = useState(false);

  // The dotted trail starts from a dot on the card's corner. The trail measures
  // that element itself, so its size and position are stated once, in the
  // card's own markup, rather than restated as numbers at the drawing end.
  const anchorDotRef = useRef<HTMLSpanElement | null>(null);

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

    // Say where the camera will end up facing in the same breath as sending it
    // there. `facing` is otherwise only recomputed once the camera is idle, so
    // for the half second the flight home takes it still held the area that
    // was in front *before* this one was opened — and the card and the trail,
    // which both read it, pointed at the wrong spot until the flight landed.
    if (resetCamera) {
      setFacing(facingSection(HOME_ANGLE));
      goHome();
    } else {
      if (activeSection) setFacing(activeSection);
      closePage();
    }
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
      {/* z-0, not -z-10. Behind a negative index the canvas painted *under*
          <main> and stopped hit-testing entirely, which silently killed every
          click and hover in the scene — buildings included. Everything meant
          to sit over it carries its own higher z-index. */}
      <div className="fixed inset-0 w-full h-full z-0 bg-[#fff3d1]">
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
            <nav className="hidden lg:flex gap-2 pointer-events-auto bg-white/85 backdrop-blur-md px-3 py-3 rounded-full border border-black/5">
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
              className="h-14 px-4 bg-white/85 backdrop-blur-md rounded-full flex items-center gap-2 text-gray-800 hover:scale-105 transition-transform border border-black/5 pointer-events-auto"
            >
              <Globe size={22} className="text-orange-500" />
              <span className="text-sm font-black w-6">{isJa ? "JP" : "EN"}</span>
            </button>

            {/* Freeze the town. Filled orange while stopped, the same "this
                toggle is on" language as the links button below. */}
            <button
              onClick={togglePaused}
              title={paused ? (isJa ? "動きを再生" : "Resume motion") : (isJa ? "動きを停止" : "Pause motion")}
              aria-label={paused ? (isJa ? "動きを再生" : "Resume motion") : (isJa ? "動きを停止" : "Pause motion")}
              aria-pressed={paused}
              className={`w-14 h-14 rounded-full flex items-center justify-center hover:scale-105 transition-transform border border-black/5 pointer-events-auto ${
                paused ? "bg-orange-500 text-white" : "bg-white/85 backdrop-blur-md text-gray-800"
              }`}
            >
              {paused ? (
                <Play size={20} fill="currentColor" />
              ) : (
                <Pause size={20} fill="currentColor" />
              )}
            </button>
          </div>
        </header>

        {/* Middle: contextual card (orbit mode only, and not while the
            frameless About panel — which has no card or leader line to
            anchor — is showing) */}
        <div className="flex-1 flex items-center w-full">
          {!pageOpen && activeSection !== "about" && (
            <AreaCard
              section={card}
              isJa={isJa}
              focused={!!activeSection}
              anchorRef={anchorDotRef}
              onOpen={() => openPage(card)}
              onStep={(step) => turnTo(adjacentSection(card, step))}
            />
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
              className={`w-11 h-11 rounded-full flex items-center justify-center hover:scale-110 transition-all border border-black/5 ${
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
                  className="w-11 h-11 bg-white/85 backdrop-blur-md rounded-full flex items-center justify-center text-gray-800 hover:scale-110 transition-transform border border-black/5 shrink-0"
                >
                  <GithubIcon size={20} />
                </a>
                <a
                  href="https://x.com/miiiwa3330"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="X"
                  className="w-11 h-11 bg-white/85 backdrop-blur-md rounded-full flex items-center justify-center text-gray-900 hover:scale-110 transition-transform border border-black/5 shrink-0"
                >
                  <XIcon size={18} />
                </a>
                <button
                  onClick={openTerminal}
                  title="Terminal mode"
                  className="w-11 h-11 bg-white/85 backdrop-blur-md rounded-full flex items-center justify-center text-green-600 hover:scale-110 transition-transform border border-black/5 shrink-0"
                >
                  <Terminal size={20} />
                </button>
              </div>
            )}
          </div>

          {/* Floating About section for home screen — left side, frameless,
              mirrored by the camera flight in Scene.tsx pushing the about
              building over to the right of the frame to clear it. Indented
              well past the logo (reference/image2.png), not flush to the
              edge, so it reads as a placed column rather than a margin note.
              Full height, top edge to bottom edge: the text is meant to run
              off both ends of the screen and be scrolled up through them. */}
          <div className="absolute left-[15%] inset-y-0 pointer-events-none z-30">
            <AnimatePresence>
              {!pageOpen && activeSection === "about" && (
                // `closePage`, not `closeToHome` — nothing here needs flying
                // anywhere. The scroll that carried the text off the screen
                // carried the camera home with it (see the About branch of
                // Scene's frame loop), so by now it is already in the home
                // framing, and a flight would only be a second arrival on top
                // of the one the reader just made. Facing is published by the
                // scene from the angle it actually stopped at.
                <About onFinish={closePage} />
              )}
            </AnimatePresence>
          </div>

          {/* Footer (only on Home screen, bottom right) */}
          <div className="absolute bottom-9 right-12 pointer-events-auto">
            {!pageOpen && <Footer />}
          </div>
        </div>
      </div>

      {/* HOME button — zoomed into a building, page not yet open.
          About is the exception: its column is read to the end to leave it, so
          a button offering the same thing would be a second, competing way out
          of the one area that already has a natural one. */}
      {activeSection && activeSection !== "about" && !pageOpen && (
        <button
          onClick={() => closeToHome("down", true)}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center gap-2 bg-white text-gray-800 font-bold py-3 px-7 rounded-full border border-black/5 hover:scale-105 transition-transform"
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
            <div className="h-screen pointer-events-none" />

            <div className="bg-white pt-24 pb-24 min-h-screen flex flex-col relative z-30">
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
            <div className="h-screen pointer-events-none" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dotted trail from the card out to the marker over its area. It only
          has a job in the free orbit view: it is what says "the card is about
          that spot over there". Focusing an area answers that question by
          filling the frame with the spot itself, so the trail — and the marker
          it points at — both withdraw. Unmounting cleanly here (rather than
          just losing its anchor when the dot above disappears) keeps it from
          freezing mid-draw at its last position. */}
      <CardLeaderLine anchorRef={anchorDotRef} hidden={pageOpen || !!activeSection} />

      {/* Terminal easter egg */}
      <TerminalOverlay />
    </main>
  );
}
