"use client";

import { Globe, Pause, Play, Menu, X } from "lucide-react";
import type { SectionType } from "@/types";
import Wordmark from "@/ui/Wordmark";
import { navItemForSection } from "./nav";
import NavPills from "./NavPills";
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
  /** Phone-sized touch screen: a different set of controls entirely. */
  handheld: boolean;
  /** Opens the full-screen panel. Owned by `Hub`, which renders the panel. */
  onMenuOpen: () => void;
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
  handheld,
  onMenuOpen,
}: Props) {
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
        aria-label="Miiiwa."
        className={`pointer-events-auto font-black text-2xl sm:text-4xl md:text-5xl tracking-tight hover:scale-[1.03] active:scale-[0.98] transition-transform select-none ${
          onLightBackground ? "text-gray-900" : "text-white"
        }`}
      >
        <Wordmark onLight={onLightBackground} />
      </button>

      {/*
       * Right-hand controls.
       *
       * A phone gets two of them, in this order: language, then the menu.
       * The pause button and the zoom control are gone there — a tap on
       * empty sky freezes the town (`useTapGesture`) and a two-finger pinch
       * moves between the orbit's two altitudes, so both buttons were
       * duplicating a gesture while taking up a third of the header. The
       * closest zoom stage, which the pinch does not reach, is what tapping
       * an area's marker has always done.
       */}
      <div className="flex items-center gap-2 sm:gap-3 md:gap-4 relative">
        {!handheld && (
          <>
            {/* Desktop navigation — from xl (1280px) up, not lg. Six items
                need about 1,250px of window beside the logo and the three
                round buttons; measured with the Note link added, the labels
                wrapped to two lines up to 1200px and to three at 1024px
                (the five sections alone already wrapped below ~1150px).
                Below xl the menu button below takes over, as it already did
                for narrow windows. `whitespace-nowrap` so a label can never
                break mid-word if the widths shift again. */}
            <NavPills
              isJa={isJa}
              current={navItemForSection(activeSection)}
              onSectionClick={onNavClick}
              className="hidden xl:flex"
            />

            {/* Narrow window, mouse: the same panel a phone gets, since the
                navigation above has nowhere to sit. */}
            <button
              onClick={onMenuOpen}
              title={isJa ? "セクション一覧" : "Menu"}
              aria-haspopup="dialog"
              aria-label={isJa ? "セクション一覧" : "Menu"}
              className="xl:hidden w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 border border-black/5 pointer-events-auto shadow-sm bg-white text-gray-800"
            >
              <Menu size={18} />
            </button>
          </>
        )}

        <button
          onClick={toggleLanguage}
          title="Toggle language"
          aria-label="Toggle language"
          className="h-11 px-3 sm:h-12 sm:px-3.5 md:h-14 md:px-4 bg-white rounded-full flex items-center gap-1.5 sm:gap-2 text-gray-800 hover:scale-105 active:scale-95 transition-all duration-200 border border-black/5 shadow-sm pointer-events-auto"
        >
          <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
          <span className="text-xs sm:text-sm font-black w-5 sm:w-6">{isJa ? "JP" : "EN"}</span>
        </button>

        {!handheld &&
          (onLightBackground ? (
            <button
              onClick={onClose}
              title={isJa ? "閉じる" : "Close"}
              aria-label={isJa ? "閉じる" : "Close"}
              className="w-[96px] sm:w-[108px] md:w-[128px] h-11 sm:h-12 md:h-14 rounded-full flex items-center justify-center gap-1.5 sm:gap-2 bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-xs sm:text-sm shadow-md transition-all hover:scale-105 active:scale-95 pointer-events-auto cursor-pointer"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>{isJa ? "閉じる" : "Close"}</span>
            </button>
          ) : (
            <>
              {/* Freeze the town */}
              <button
                onClick={togglePaused}
                title={paused ? (isJa ? "動きを再生" : "Resume motion") : (isJa ? "動きを停止" : "Pause motion")}
                aria-label={paused ? (isJa ? "動きを再生" : "Resume motion") : (isJa ? "動きを停止" : "Pause motion")}
                aria-pressed={paused}
                className={`w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 border border-black/5 shadow-sm pointer-events-auto ${
                  paused ? "bg-orange-600 text-white" : "bg-white text-gray-800"
                }`}
              >
                {paused ? (
                  <Play className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" />
                ) : (
                  <Pause className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" />
                )}
              </button>

              <ZoomControl isJa={isJa} stage={zoomStage} onSelect={onZoomSelect} />
            </>
          ))}

        {/*
         * The phone's last slot, shared by two buttons that swap places.
         *
         * While the detail sheet is up it closes the sheet; otherwise it
         * opens the menu. One slot rather than two because the two are never
         * both useful: navigating somewhere else while reading means leaving
         * what you are reading, which is what closing does first anyway —
         * and a second round button beside this one is a third of the header
         * spent saying so.
         */}
        {handheld &&
          (onLightBackground ? (
            <button
              onClick={onClose}
              title={isJa ? "閉じる" : "Close"}
              aria-label={isJa ? "閉じる" : "Close"}
              className="w-11 h-11 rounded-full flex items-center justify-center bg-[#ea580c] text-white shadow-md active:scale-95 transition-transform pointer-events-auto"
            >
              <X size={20} />
            </button>
          ) : (
            <button
              onClick={onMenuOpen}
              title={isJa ? "セクション一覧" : "Menu"}
              aria-haspopup="dialog"
              aria-label={isJa ? "セクション一覧" : "Menu"}
              className="w-11 h-11 rounded-full flex items-center justify-center bg-white text-gray-800 border border-black/5 shadow-sm active:scale-95 transition-transform pointer-events-auto"
            >
              <Menu size={20} />
            </button>
          ))}
      </div>
    </header>
  );
}
