"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Globe, Menu, X } from "lucide-react";
import Wordmark from "@/ui/Wordmark";
import NavPills from "@/hub/NavPills";
import MobileMenu from "@/hub/MobileMenu";
import { navItemForPath } from "@/hub/nav";
import { useLanguage } from "@/state/LanguageContext";
import { useHandheld } from "@/state/useHandheld";

/**
 * The reading pages' header — the hub's own, as it looks while the detail
 * sheet is up: the dark wordmark top left, the white pill of navigation,
 * language button, and the close button on the right. Below xl the menu button
 * opens the same full-screen panel.
 *
 * Drawn to match the hub's header furniture pixel-for-pixel so that moving
 * between a hub section and a reading page creates no visual discrepancy.
 *
 * Sticky at the top of the viewport with backdrop blur, so the title
 * (Miiiwa.) and header controls remain fixed while reading.
 */
export default function ReadingHeader() {
  const pathname = usePathname();
  const current = navItemForPath(pathname);
  const { language, toggleLanguage } = useLanguage();
  const isJa = language === "ja";
  const handheld = useHandheld();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 inset-x-0 z-40 pointer-events-none safe-inset">
      <div className="flex justify-between items-center sm:items-start w-full gap-3 sm:gap-6 p-7 sm:p-9">
        {/* A plain <a> on purpose: into the hub is a full load (see `leadsToHub`). */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          aria-label="Miiiwa. トップ（惑星）へ"
          className="pointer-events-auto font-black text-2xl sm:text-4xl md:text-5xl tracking-tight text-gray-900 hover:scale-[1.03] active:scale-[0.98] transition-transform select-none"
        >
          <Wordmark onLight />
        </a>

        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 relative pointer-events-auto">
          {!handheld && (
            <>
              {/* Desktop navigation — from xl (1280px) up. */}
              <NavPills isJa={isJa} current={current} className="hidden xl:flex" />

              {/* Narrow window, mouse: panel button */}
              <button
                onClick={() => setMenuOpen(true)}
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

          {!handheld && (
            /* eslint-disable-next-line @next/next/no-html-link-for-pages */
            <a
              href="/"
              title={isJa ? "閉じる" : "Close"}
              aria-label={isJa ? "閉じる" : "Close"}
              className="w-[96px] sm:w-[108px] md:w-[128px] h-11 sm:h-12 md:h-14 rounded-full flex items-center justify-center gap-1.5 sm:gap-2 bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-xs sm:text-sm shadow-md transition-all hover:scale-105 active:scale-95 pointer-events-auto cursor-pointer"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>{isJa ? "閉じる" : "Close"}</span>
            </a>
          )}

          {handheld && (
            /* eslint-disable-next-line @next/next/no-html-link-for-pages */
            <a
              href="/"
              title={isJa ? "閉じる" : "Close"}
              aria-label={isJa ? "閉じる" : "Close"}
              className="w-11 h-11 rounded-full flex items-center justify-center bg-[#ea580c] text-white shadow-md active:scale-95 transition-transform pointer-events-auto"
            >
              <X size={20} />
            </a>
          )}
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && <MobileMenu isJa={isJa} current={current} onClose={() => setMenuOpen(false)} />}
      </AnimatePresence>
    </header>
  );
}
