"use client";

import { useState } from "react";
import { Globe, Pause, Play, Menu, X } from "lucide-react";
import type { SectionType } from "@/types";
import { NAV } from "./nav";
import ZoomControl, { type ZoomStage } from "./ZoomControl";

type Props = {
  activeSection: SectionType;
  isJa: boolean;
  toggleLanguage: () => void;
  paused: boolean;
  togglePaused: () => void;
  onLogoClick: () => void;
  onNavClick: (id: NonNullable<SectionType>) => void;
  zoomStage: ZoomStage;
  onZoomSelect: (stage: ZoomStage) => void;
  /** True while the white detail sheet covers the canvas — see the logo below. */
  onLightBackground: boolean;
  onClose?: () => void;
};

export default function HubHeader({
  activeSection,
  isJa,
  toggleLanguage,
  paused,
  togglePaused,
  onLogoClick,
  onNavClick,
  zoomStage,
  onZoomSelect,
  onLightBackground,
  onClose,
}: Props) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="flex justify-between items-center sm:items-start w-full gap-3 sm:gap-6 relative">
      {/*
       * Logo → full reset. Text only, no frame/icon.
       *
       * The colour has to follow what is behind it. The header sits at z-40
       * and the detail sheet at z-20, so the logo keeps floating over the
       * sheet once a section is opened — and the sheet is white.
       */}
      <button
        onClick={onLogoClick}
        className={`pointer-events-auto font-black text-2xl sm:text-4xl md:text-5xl tracking-tight hover:scale-[1.03] active:scale-[0.98] transition-transform ${
          onLightBackground
            ? "text-gray-900"
            : "text-white [text-shadow:0_1px_8px_rgba(255,255,255,0.7)]"
        }`}
      >
        Miiiwa<span className="text-orange-500">.</span>
      </button>

      {/* Nav + language + actions */}
      <div className="flex items-center gap-2 sm:gap-3 md:gap-4 relative">
        {/* Desktop navigation */}
        <nav className="hidden lg:flex gap-1.5 pointer-events-auto bg-white/90 backdrop-blur-md px-2 py-2 rounded-full border border-black/5 shadow-sm">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavClick(item.id)}
              className={`px-4 py-2 rounded-full text-base font-bold transition-all duration-200 ${
                activeSection === item.id
                  ? "bg-orange-600 text-white shadow-sm"
                  : "text-gray-700 hover:text-orange-600 hover:bg-orange-50/80"
              }`}
            >
              {isJa ? item.ja : item.en}
            </button>
          ))}
        </nav>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileMenuOpen((o) => !o)}
          title={isJa ? "セクション一覧" : "Menu"}
          aria-expanded={mobileMenuOpen}
          aria-label={isJa ? "セクション一覧" : "Menu"}
          className="lg:hidden w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 border border-black/5 pointer-events-auto shadow-sm backdrop-blur-md bg-white/90 text-gray-800"
        >
          {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden absolute top-full right-0 mt-3 p-2 bg-white/95 backdrop-blur-md rounded-2xl border border-black/10 shadow-xl flex flex-col gap-1 min-w-[190px] pointer-events-auto z-50 animate-[fadeIn_0.2s_ease]">
            {NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onNavClick(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`px-4 py-2.5 rounded-xl text-left font-bold text-sm transition-colors ${
                  activeSection === item.id
                    ? "bg-orange-600 text-white shadow-sm"
                    : "text-gray-700 hover:bg-orange-50 hover:text-orange-600"
                }`}
              >
                {isJa ? item.ja : item.en}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={toggleLanguage}
          title="Toggle language"
          aria-label="Toggle language"
          className="h-11 px-3 sm:h-12 sm:px-3.5 md:h-14 md:px-4 bg-white/90 backdrop-blur-md rounded-full flex items-center gap-1.5 sm:gap-2 text-gray-800 hover:scale-105 active:scale-95 transition-all duration-200 border border-black/5 shadow-sm pointer-events-auto"
        >
          <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
          <span className="text-xs sm:text-sm font-black w-5 sm:w-6">{isJa ? "JP" : "EN"}</span>
        </button>

        {/* Freeze the town */}
        <button
          onClick={togglePaused}
          title={paused ? (isJa ? "動きを再生" : "Resume motion") : (isJa ? "動きを停止" : "Pause motion")}
          aria-label={paused ? (isJa ? "動きを再生" : "Resume motion") : (isJa ? "動きを停止" : "Pause motion")}
          aria-pressed={paused}
          className={`w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 border border-black/5 shadow-sm backdrop-blur-md pointer-events-auto ${
            paused ? "bg-orange-600 text-white" : "bg-white/90 text-gray-800"
          }`}
        >
          {paused ? (
            <Play className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" />
          ) : (
            <Pause className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" />
          )}
        </button>

        {onLightBackground ? (
          <button
            onClick={onClose}
            title={isJa ? "閉じる" : "Close"}
            aria-label={isJa ? "閉じる" : "Close"}
            className="h-11 px-3.5 sm:h-12 sm:px-4 md:h-14 md:px-5 rounded-full flex items-center gap-1.5 sm:gap-2 bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-xs sm:text-sm shadow-md transition-all hover:scale-105 active:scale-95 pointer-events-auto cursor-pointer"
          >
            <X size={18} />
            <span className="hidden sm:inline">{isJa ? "閉じる" : "Close"}</span>
          </button>
        ) : (
          <ZoomControl isJa={isJa} stage={zoomStage} onSelect={onZoomSelect} />
        )}
      </div>
    </header>
  );
}
