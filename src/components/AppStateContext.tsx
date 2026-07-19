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
  /** Full reset: close the page, unfocus, and reset camera position + angle. */
  goHome: () => void;
  /** Bumps every time goHome() runs; the camera watches it to reset its orbit. */
  homeNonce: number;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [activeSection, setActiveSection] = useState<SectionType>(null);
  const [pageOpen, setPageOpen] = useState(false);
  const [homeNonce, setHomeNonce] = useState(0);

  const openPage = useCallback((section: NonNullable<SectionType>) => {
    setActiveSection(section);
    setPageOpen(true);
  }, []);

  const goHome = useCallback(() => {
    setActiveSection(null);
    setPageOpen(false);
    setHomeNonce((n) => n + 1);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  return (
    <AppStateContext.Provider
      value={{ activeSection, setActiveSection, pageOpen, setPageOpen, openPage, goHome, homeNonce }}
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
