"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAppState, SectionType } from "@/state/AppStateContext";
import { useLanguage } from "@/state/LanguageContext";
import { useTerminal } from "@/terminal/TerminalContext";
import Scene from "@/scene/Scene";
import TerminalOverlay from "@/terminal/TerminalOverlay";
import CardLeaderLine from "./CardLeaderLine";
import AreaCard from "./AreaCard";
import HubHeader from "./HubHeader";
import HubDock from "./HubDock";
import { adjacentOnTour, TOUR_ORDER } from "@/scene/planet/tour";
import Sheet from "@/detail/Sheet";
import { exitDirectionFor, type ExitDirection } from "@/detail/detailSheet";
import { X } from "lucide-react";

// Each transparent spacer bracketing the detail page is exactly one viewport
// tall, which is what makes "the panel has left the screen" and "progress has
// reached 1" the same instant. At 1.5 there was a half-viewport dead zone where
// the panel was already gone but scrolling further still did nothing.
// Kept in sync with the h-screen classes on Sheet's two spacers.
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

export default function Hub() {
  const { activeSection, setActiveSection, pageOpen, openPage, closePage, goHome, facing, setFacing, turnTo, paused, togglePaused } = useAppState();
  const { language, toggleLanguage } = useLanguage();
  const { openTerminal } = useTerminal();
  const isJa = language === "ja";

  // Which area the card is about. With no section explicitly focused it is
  // whatever the camera is turned towards, so rotating the diorama leafs
  // through the areas.
  const card = activeSection ?? facing;
  const openedAt = useRef(0);

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
      // The tour's own starting point (u = 0) is what HOME actually flies to
      // — see the destination effect's "reset" branch in Scene.tsx.
      setFacing(TOUR_ORDER[0]);
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
      <div className="fixed inset-0 w-full h-full z-0 bg-[#070a14]">
        <Scene obscured={sceneObscured} />
      </div>

      {/* --- PERSISTENT CHROME (always visible in both modes) --- */}
      <div className="fixed inset-0 pointer-events-none z-40 flex flex-col justify-between p-7 sm:p-9">
        <HubHeader
          activeSection={activeSection}
          isJa={isJa}
          toggleLanguage={toggleLanguage}
          paused={paused}
          togglePaused={togglePaused}
          onLogoClick={() => closeToHome("down", true)}
          onNavClick={handleNav}
        />

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
              onStep={(step) => turnTo(adjacentOnTour(card, step))}
            />
          )}
        </div>

        <HubDock
          isJa={isJa}
          openTerminal={openTerminal}
          pageOpen={pageOpen}
          activeSection={activeSection}
          onAboutFinish={closePage}
        />
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
      <Sheet
        pageOpen={pageOpen}
        activeSection={activeSection}
        exitDirection={exitDirection}
        scrollerRef={scroller}
        onScroll={handleScroll}
      />

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
