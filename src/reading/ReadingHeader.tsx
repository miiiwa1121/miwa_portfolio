"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Menu } from "lucide-react";
import Wordmark from "@/ui/Wordmark";
import NavPills from "@/hub/NavPills";
import MobileMenu from "@/hub/MobileMenu";
import { navItemForPath } from "@/hub/nav";

/**
 * The reading pages' header — the hub's own, as it looks while the detail
 * sheet is up: the dark wordmark top left, the white pill of navigation top
 * right, and below xl the menu button that opens the same full-screen panel.
 * Drawn from the hub's components (`Wordmark`, `NavPills`, `MobileMenu`), so
 * leaving the planet for one of these pages does not change the furniture.
 *
 * What the hub's header has and this one does not: the language toggle (the
 * reading pages are Japanese only — see docs/tech.md), and the pause, zoom and
 * close buttons, which all act on a diorama that is not here.
 *
 * Not fixed, unlike the hub's: it scrolls away with the page, so a long
 * article is never read through the logo.
 */
export default function ReadingHeader() {
  const current = navItemForPath(usePathname());
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="flex justify-between items-center sm:items-start w-full gap-3 sm:gap-6 p-7 sm:p-9">
      {/* A plain <a> on purpose: into the hub is a full load (see `leadsToHub`). */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a
        href="/"
        aria-label="Miiiwa. トップ（惑星）へ"
        className="font-black text-2xl sm:text-4xl md:text-5xl tracking-tight text-gray-900 hover:scale-[1.03] active:scale-[0.98] transition-transform select-none"
      >
        <Wordmark onLight />
      </a>

      <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
        {/* From xl up, as on the hub: the six labels need about 1,250px. */}
        <NavPills isJa current={current} className="hidden xl:flex" />
        <button
          onClick={() => setMenuOpen(true)}
          title="メニュー"
          aria-haspopup="dialog"
          aria-label="メニュー"
          className="xl:hidden w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 border border-black/5 shadow-sm bg-white text-gray-800"
        >
          <Menu size={18} />
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && <MobileMenu isJa current={current} onClose={() => setMenuOpen(false)} />}
      </AnimatePresence>
    </header>
  );
}
