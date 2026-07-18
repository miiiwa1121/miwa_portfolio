"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type SectionType = "about" | "products" | "skills" | "experience" | "contact" | null;

interface AppStateContextType {
  activeSection: SectionType;
  setActiveSection: (section: SectionType) => void;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [activeSection, setActiveSection] = useState<SectionType>(null);

  return (
    <AppStateContext.Provider value={{ activeSection, setActiveSection }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}
