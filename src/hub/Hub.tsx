"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useAppState } from "@/state/AppStateContext";
import { facingNow, publishFacing } from "@/state/facingChannel";
import type { SectionType } from "@/types";
import { useLanguage } from "@/state/LanguageContext";
import { useTerminal } from "@/terminal/TerminalContext";
import Scene from "@/scene/Scene";
import TerminalOverlay from "@/terminal/TerminalOverlay";
import CardLeaderLine from "./card/CardLeaderLine";
import SectionCard from "./card/SectionCard";
import HubHeader from "./HubHeader";
import HubDock from "./HubDock";
import SemanticSEO from "./SemanticSEO";
import About from "./about/About";
import type { ZoomStage } from "./ZoomControl";
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
  const {
    activeSection,
    setActiveSection,
    pageOpen,
    openPage,
    closePage,
    goHome,
    turnTo,
    paused,
    togglePaused,
    orbitZoom,
    goToOrbit,
  } = useAppState();
  const { language, toggleLanguage } = useLanguage();
  const { openTerminal } = useTerminal();
  const isJa = language === "ja";

  /**
   * Which area the card is about. With no section explicitly focused it is
   * whatever the camera is turned towards, so rotating the diorama leafs
   * through the areas.
   *
   * A function, called at the moment an answer is needed, rather than a value
   * computed each render: reading `facing` here would re-render this component
   * — and with it the `<Canvas>` and the whole three.js tree — several times a
   * lap of the idle drift. See `facingChannel`.
   */
  const cardSection = () => activeSection ?? facingNow();
  const openedAt = useRef(0);

  // What the zoom control highlights: any focused section (including About)
  // reads as its own "building" stage, same as a pinch reaching the closest
  // step — otherwise it's whichever free-orbit altitude orbitZoom names.
  const zoomStage: ZoomStage = activeSection ? "building" : orbitZoom;
  const handleZoomSelect = (stage: ZoomStage) => {
    if (stage === "building") {
      setActiveSection(facingNow());
    } else {
      goToOrbit(stage);
    }
  };

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
      publishFacing(TOUR_ORDER[0]);
      goHome();
    } else {
      if (activeSection) publishFacing(activeSection);
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

  // Whether the self-intro crawl is on screen — read by both the crawl's own
  // layer below and the canvas's pointer-events toggle, so the two can never
  // disagree about which one is meant to catch a gesture.
  const aboutShowing = !pageOpen && activeSection === "about";

  return (
    <main className="w-full h-screen overflow-hidden relative font-sans">
      {/* Accessibility & Crawler semantic HTML for SEO and AdSense crawler review */}
      <SemanticSEO />
      {/* Bottom layer: flat space colour. Split out from the canvas (below)
          so the canvas itself can be left transparent — see Scene.tsx's own
          note on why there's no `<color attach="background">` there any
          more. */}
      <div className="fixed inset-0 w-full h-full z-0 bg-[#070a14]" />

      {/* Self-intro crawl: floating text straight over the space colour,
          *underneath* the (now transparent) canvas. The planet, buildings and
          satellites the canvas draws occlude the crawl per-pixel wherever
          they paint an opaque pixel — a z-index alone could never do this,
          since the canvas is one flat layer and cannot have part of its own
          content behind DOM and part in front of it. Moved out of HubDock
          (where it used to live inside the z-40 chrome stack, on top of
          everything) for exactly this reason. `pointer-events-none` on the
          wrapper, same as before — the scroller inside opts itself back in. */}
      <div className="fixed inset-0 z-[5] pointer-events-none">
        <AnimatePresence>
          {aboutShowing && (
            // `closePage`, not a fly-home. The scroll that carried the text
            // off the screen carried the camera home with it (see the About
            // branch of Scene's frame loop), so by now it is already in the
            // home framing, and a flight would only be a second arrival on
            // top of the one the reader just made. Facing is published by
            // the scene from the angle it actually stopped at.
            <About onFinish={closePage} />
          )}
        </AnimatePresence>
      </div>

      {/* 3D scene, transparent, painted over both layers above. */}
      {/* z-10, not -z-10. Behind a negative index the canvas painted *under*
          <main> and stopped hit-testing entirely, which silently killed every
          click and hover in the scene — buildings included. Everything meant
          to sit over it carries its own higher z-index. */}
      {/* touch-none: without it, a two-finger gesture here is read by the
          browser as native pinch-zoom (or pan) before useViewInput's own
          pointer handlers see it — the pointers get cancelled out from under
          the pinch-to-orbit-zoom logic. Paired with the page's own
          maximumScale/userScalable in layout.tsx, which stops the same
          gesture from zooming the page anywhere outside the canvas. */}
      {/* pointer-events-none on this div while the crawl is showing: with the
          canvas now painted *in front of* the crawl layer (z-10 over z-5,
          needed for the occlusion above), it would otherwise catch every
          gesture over the whole viewport before the crawl's own wheel
          handler ever saw one. Nothing in the scene needs a pointer hit
          during About anyway — markers sit at radius 0 and drag/wheel
          orbiting is already locked out (orbitLockedRef) whenever a section
          is focused. `interactive={!aboutShowing}` on Scene itself is the
          other half of this — see its own prop comment for why turning off
          pointer-events on just this wrapper div is not enough by itself. */}
      <div
        className={`fixed inset-0 w-full h-full z-10 touch-none ${aboutShowing ? "pointer-events-none" : ""}`}
      >
        <Scene obscured={sceneObscured} interactive={!aboutShowing} />
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
          zoomStage={zoomStage}
          onZoomSelect={handleZoomSelect}
          // The sheet is the only white surface that ever gets under the
          // header. About is deliberately not one: it has no sheet, its text
          // sits straight on the starfield, and the logo stays white there.
          onLightBackground={pageOpen}
          onClose={() => closeToHome("down", false)}
        />

        {/* Middle: contextual card (orbit mode only, and not while the
            frameless About panel — which has no card or leader line to
            anchor — is showing) */}
        <div className="flex-1 flex items-center w-full">
          {!pageOpen && activeSection !== "about" && (
            <SectionCard
              focusedSection={activeSection}
              isJa={isJa}
              anchorRef={anchorDotRef}
              // Both read the area in front when they fire rather than closing
              // over it, so this component never has to re-render for it — see
              // `facingChannel` for why that matters here specifically.
              onOpen={() => openPage(cardSection())}
              onStep={(step) => turnTo(adjacentOnTour(cardSection(), step))}
            />
          )}
        </div>

        <HubDock isJa={isJa} openTerminal={openTerminal} pageOpen={pageOpen} />
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
