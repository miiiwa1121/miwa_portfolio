"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import { hashForSection, sectionFromHash } from "./sectionUrl";
import type { SectionType } from "@/types";

export type { SectionType };

interface AppStateContextType {
  /** Which building the camera is focused on (null = home diorama view). */
  activeSection: SectionType;
  setActiveSection: (section: SectionType) => void;
  /** Whether the detail page (About…Footer) is shown and scrollable. */
  pageOpen: boolean;
  setPageOpen: (open: boolean) => void;
  /** Open the detail page focused on a section (also focuses the camera). */
  openPage: (section: NonNullable<SectionType>) => void;
  /**
   * Close the detail page and unfocus, leaving the camera exactly where the
   * section framing put it. This is what scrolling off either end does: you
   * stay looking at the area you were just reading about.
   */
  closePage: () => void;
  /** Full reset: close the page and fly the camera back to the default view. */
  goHome: () => void;
  /** Bumps every time goHome() runs; the camera watches it to reset its view. */
  homeNonce: number;
  /**
   * Which area the camera is currently turned towards. Published by the scene
   * as it orbits, and read by the card — so the card can never disagree with
   * what is actually on screen.
   */
  facing: NonNullable<SectionType>;
  setFacing: (section: NonNullable<SectionType>) => void;
  /**
   * Ask the camera to turn to an area without focusing it — what swiping the
   * card does. Carries a nonce so asking twice for the same area still turns.
   */
  turnTo: (section: NonNullable<SectionType>) => void;
  turnRequest: { section: NonNullable<SectionType>; nonce: number } | null;
  /**
   * Whether the diorama is frozen. Motion only: the idle orbit and everything
   * that moves by itself stop where they are, while the camera can still be
   * turned by hand and areas can still be opened — a paused town you can walk
   * around is the point, a dead canvas is not.
   */
  paused: boolean;
  togglePaused: () => void;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [activeSection, setActiveSection] = useState<SectionType>(null);
  const [pageOpen, setPageOpen] = useState(false);
  const [homeNonce, setHomeNonce] = useState(0);
  const [facing, setFacing] = useState<NonNullable<SectionType>>("products");
  const [turnRequest, setTurnRequest] = useState<{ section: NonNullable<SectionType>; nonce: number } | null>(null);
  const [paused, setPaused] = useState(false);

  const togglePaused = useCallback(() => setPaused((p) => !p), []);

  const openPage = useCallback((section: NonNullable<SectionType>) => {
    setActiveSection(section);
    if (section !== "about") {
      setPageOpen(true);
    } else {
      setPageOpen(false);
    }
  }, []);

  const turnTo = useCallback((section: NonNullable<SectionType>) => {
    setTurnRequest((previous) => ({ section, nonce: (previous?.nonce ?? 0) + 1 }));
  }, []);

  const closePage = useCallback(() => {
    setActiveSection(null);
    setPageOpen(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const goHome = useCallback(() => {
    closePage();
    setHomeNonce((n) => n + 1);
  }, [closePage]);

  // --- The URL ---------------------------------------------------------
  // The open section is mirrored into the hash so the back button closes the
  // panel instead of leaving the site, and a section can be linked to.

  /** False until the hash we arrived with has been honoured. */
  const urlApplied = useRef(false);

  useEffect(() => {
    const applyUrl = (fromHistory: boolean) => {
      const section = sectionFromHash(window.location.hash);
      setActiveSection(section);
      setPageOpen(!!section && section !== "about");
      // Going back to no section is a request to see the diorama again.
      if (fromHistory && !section) setHomeNonce((n) => n + 1);
      urlApplied.current = true;
    };

    // Honour a hash the visitor arrived with, deferred a frame rather than run
    // during render: the page is prerendered without it, so applying it in the
    // render pass would make the first client render disagree with the markup.
    const initial = requestAnimationFrame(() => applyUrl(false));
    const onPopState = () => applyUrl(true);

    window.addEventListener("popstate", onPopState);
    return () => {
      cancelAnimationFrame(initial);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  useEffect(() => {
    // Until the incoming hash has been read, writing to the URL would erase it.
    if (!urlApplied.current) return;

    const wanted = hashForSection(pageOpen ? activeSection : null);
    // Already correct — which is exactly the case when this state came *from*
    // the URL, so following a link or going back never pushes a second entry.
    if (window.location.hash === wanted) return;

    // pushState, not replaceState: each opened section is its own step back,
    // which is what makes the back button close the panel.
    window.history.pushState(null, "", wanted || window.location.pathname);
  }, [pageOpen, activeSection]);

  return (
    <AppStateContext.Provider
      value={{ activeSection, setActiveSection, pageOpen, setPageOpen, openPage, closePage, goHome, homeNonce, facing, setFacing, turnTo, turnRequest, paused, togglePaused }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error("useAppState must be used within an AppStateProvider");
  }
  return context;
}
