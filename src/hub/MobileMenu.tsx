"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { Terminal, X } from "lucide-react";
import { GithubIcon, XIcon } from "@/ui/icons";
import type { SectionType } from "@/types";
import { NAV, leadsToHub, navKey, offPlanetHref, type NavItem } from "./nav";

/**
 * The handheld navigation, as a panel over the whole screen.
 *
 * It replaces a dropdown that hung off the header. The dropdown had two
 * problems a phone makes unavoidable: it painted over the detail sheet's own
 * title (its `z-50` sits above the sheet's `z-20`), and at 190px wide on a
 * 390px screen it left the five areas in a column narrow enough to misread.
 * Covering the screen is also what lets this hold the things that no longer
 * have anywhere to live on the main view — the external links and the
 * copyright — rather than each of them needing a corner of their own.
 *
 * Everything here is one tap from the same thumb position the hamburger was
 * under, and the close button lands exactly where that hamburger was, so the
 * button reads as having opened into the panel rather than been replaced.
 *
 * The reading pages open the same panel. There an area is not a camera
 * flight but a link to the hub (`offPlanetHref`; a plain <a>, see
 * `leadsToHub`), and there is no terminal to open, so both of those props are
 * optional.
 */

type Props = {
  isJa: boolean;
  /** The row drawn lit. */
  current: NavItem | undefined;
  /** On the hub: an area's row flies the camera instead of linking. */
  onNavClick?: (id: NonNullable<SectionType>) => void;
  onClose: () => void;
  /** On the hub only — the terminal overlay lives there. */
  openTerminal?: () => void;
};

const PANEL_VARIANTS: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.18, ease: "easeOut", staggerChildren: 0.045, delayChildren: 0.06 },
  },
  exit: { opacity: 0, transition: { duration: 0.14, ease: "easeIn" } },
};

const ROW_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 420, damping: 30 } },
  // No exit of its own: the panel fades as a whole, and rows sliding out
  // underneath that fade only makes the close feel slower than the tap was.
  exit: { opacity: 0 },
};

export default function MobileMenu({
  isJa,
  current,
  onNavClick,
  onClose,
  openTerminal,
}: Props) {
  // Escape closes it. The panel covers everything, so there is no "click
  // outside" to fall back on — the close button and this are the two ways out.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // A reading page scrolls the document itself, and a swipe on the panel —
  // which has nothing of its own to scroll — would scroll it unseen behind.
  // (The hub's document never scrolls, so there this changes nothing.)
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <motion.div
      variants={PANEL_VARIANTS}
      initial="hidden"
      animate="visible"
      exit="exit"
      role="dialog"
      aria-modal="true"
      aria-label={isJa ? "メニュー" : "Menu"}
      // z-50: above the header (z-40) — the close button has to sit on top of
      // the hamburger it replaces, in the same spot.
      className="fixed inset-0 z-50 pointer-events-auto bg-[#070a14]/95 backdrop-blur-xl text-white flex flex-col safe-inset"
    >
      <div className="flex flex-col h-full p-7 sm:p-9">
        {/* Top row: the close button lands on the hamburger's own footprint. */}
        <div className="flex justify-end shrink-0">
          <button
            onClick={onClose}
            aria-label={isJa ? "メニューを閉じる" : "Close menu"}
            className="w-11 h-11 rounded-full flex items-center justify-center bg-[#ea580c] text-white shadow-md active:scale-95 transition-transform"
          >
            <X size={20} />
          </button>
        </div>

        {/* The areas and the pages off the planet, in one numbered list.
            Sized to be read at arm's length, not to fit as many as possible:
            six rows is the whole list, so there is no scroll to budget for. */}
        <nav className="flex-1 flex flex-col justify-center gap-1 min-h-0">
          {NAV.map((item, i) => {
            const lit = item === current;
            const rowClass = `group flex items-baseline gap-4 px-2 py-3 rounded-2xl text-left transition-colors active:bg-white/10 ${
              lit ? "text-orange-400" : "text-white"
            }`;
            const content = (
              <>
                <span
                  aria-hidden="true"
                  className={`font-mono text-xs tabular-nums shrink-0 ${
                    lit ? "text-orange-400" : "text-white/35"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex flex-col">
                  <span className="text-3xl font-black tracking-tight leading-tight">
                    {isJa ? item.ja : item.en}
                  </span>
                  <span
                    className={`text-[11px] font-bold uppercase tracking-[0.2em] ${
                      lit ? "text-orange-400/70" : "text-white/40"
                    }`}
                  >
                    {isJa ? item.en : item.ja}
                  </span>
                </span>
              </>
            );

            if (item.section !== undefined && onNavClick) {
              const id = item.section;
              return (
                <motion.button
                  key={navKey(item)}
                  variants={ROW_VARIANTS}
                  onClick={() => {
                    onNavClick(id);
                    onClose();
                  }}
                  aria-current={lit ? "page" : undefined}
                  className={rowClass}
                >
                  {content}
                </motion.button>
              );
            }
            const href = offPlanetHref(item);
            const linkProps = {
              href,
              onClick: onClose,
              "aria-current": lit ? ("page" as const) : undefined,
              className: rowClass,
            };
            return (
              <motion.div key={navKey(item)} variants={ROW_VARIANTS}>
                {leadsToHub(href) ? <a {...linkProps}>{content}</a> : <Link {...linkProps}>{content}</Link>}
              </motion.div>
            );
          })}
        </nav>

        {/* The links that used to hide behind the monitor button in the
            bottom-left corner. That corner is the card rail's now, so they
            are parked here — visible rather than behind a hover, which a
            phone does not have anyway. */}
        <motion.div variants={ROW_VARIANTS} className="flex items-center gap-3 shrink-0 pt-6">
          <a
            href="https://github.com/miiiwa1121"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10 text-white border border-white/10 active:scale-95 transition-transform"
          >
            <GithubIcon size={20} />
          </a>
          <a
            href="https://x.com/miiiwa3330"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="X"
            className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10 text-white border border-white/10 active:scale-95 transition-transform"
          >
            <XIcon size={18} />
          </a>
          {openTerminal && (
            <button
              onClick={() => {
                openTerminal();
                onClose();
              }}
              aria-label="Terminal mode"
              className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10 text-emerald-400 border border-white/10 active:scale-95 transition-transform"
            >
              <Terminal size={20} />
            </button>
          )}
        </motion.div>

        {/* The copyright and the privacy link. They used to be pinned to the
            bottom-right of the diorama, where at 390px the link ran off the
            frame ("Privacy Polic") and collided with both the HOME button and
            the links button. There is no room for them on the main view, so
            they live here. */}
        <motion.div
          variants={ROW_VARIANTS}
          className="flex items-center gap-3 shrink-0 pt-5 mt-5 border-t border-white/10 text-xs font-mono text-white/45"
        >
          <span>© {new Date().getFullYear()} Miiiwa</span>
          <span aria-hidden="true">•</span>
          <Link
            href="/privacy"
            onClick={onClose}
            className="underline underline-offset-2 py-2 active:text-orange-400 transition-colors"
          >
            Privacy Policy
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}
