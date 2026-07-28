"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type SectionType = "about" | "products" | "skills" | "experience" | "contact" | null;

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
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [activeSection, setActiveSection] = useState<SectionType>(null);
  const [pageOpen, setPageOpen] = useState(false);
  const [homeNonce, setHomeNonce] = useState(0);
  const [facing, setFacing] = useState<NonNullable<SectionType>>("products");
  const [turnRequest, setTurnRequest] = useState<{ section: NonNullable<SectionType>; nonce: number } | null>(null);

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

  return (
    <AppStateContext.Provider
      value={{ activeSection, setActiveSection, pageOpen, setPageOpen, openPage, closePage, goHome, homeNonce, facing, setFacing, turnTo, turnRequest }}
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
