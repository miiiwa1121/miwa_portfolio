"use client";

import Link from "next/link";

import { RefObject, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { SectionType } from "@/types";
import { useAppState } from "@/state/AppStateContext";
import { SHEET_VARIANTS, type ExitDirection } from "./detailSheet";
import Products from "./Products";
import Skills from "./Skills";
import Experience from "./Experience";
import Contact from "./Contact";

type Props = {
  pageOpen: boolean;
  activeSection: SectionType;
  exitDirection: ExitDirection;
  scrollerRef: RefObject<HTMLDivElement | null>;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
};

/**
 * The HTML detail page (About…Footer), bracketed by two transparent spacers.
 * Scrolling off either end returns home — see `onScroll` in the caller.
 */
export default function Sheet({
  pageOpen,
  activeSection,
  exitDirection,
  scrollerRef,
  onScroll,
}: Props) {
  const { setActiveSection } = useAppState();

  /**
   * The project an Experience milestone asked Products to open with.
   *
   * Held here rather than in `AppStateContext`: every change to that context
   * re-renders the whole three.js tree (see `facingChannel`), and this is
   * nothing the scene needs to know about.
   */
  const [requestedProject, setRequestedProject] = useState<string | null>(null);

  // Dropped the moment the reader is anywhere but Products — on the way out,
  // not on arrival, so coming back to Products later by any other route opens
  // it plain. Adjusted during render (React's "storing information from
  // previous renders") rather than in an effect, which would cost a second
  // render and is what react-hooks/set-state-in-effect forbids here.
  const [previousSection, setPreviousSection] = useState(activeSection);
  if (activeSection !== previousSection) {
    setPreviousSection(activeSection);
    if (activeSection !== "products") setRequestedProject(null);
  }

  // The same switch the header's nav makes while the page is open: the sheet
  // stays up, its content changes, and the camera flies behind it.
  const openProject = (slug: string) => {
    setRequestedProject(slug);
    setActiveSection("products");
  };

  return (
    <AnimatePresence custom={exitDirection}>
      {pageOpen && activeSection && activeSection !== "about" && (
        <motion.div
          ref={scrollerRef}
          custom={exitDirection}
          variants={SHEET_VARIANTS}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ type: "spring", stiffness: 280, damping: 34, mass: 0.9 }}
          className="fixed inset-0 z-20 overflow-y-auto pointer-events-auto"
          onScroll={onScroll}
        >
          {/* Transparent spacer: scrolling up into it returns home */}
          <div className="h-screen pointer-events-none" />

          <div className="bg-[#fffdf7] pt-24 pb-24 min-h-screen flex flex-col relative z-30">
            <div className="flex-grow">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {activeSection === "products" && <Products initialProject={requestedProject} />}
                  {activeSection === "skills" && <Skills />}
                  {activeSection === "experience" && <Experience onOpenProject={openProject} />}
                  {activeSection === "contact" && <Contact />}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer link in detail sheet */}
            <div className="mt-16 text-center border-t border-gray-100 pt-8">
              <Link
                href="/privacy"
                className="text-xs text-gray-400 hover:text-orange-500 underline font-mono transition-colors"
              >
                Privacy Policy
              </Link>
            </div>
          </div>

          {/* Transparent spacer: scrolling down into it returns home */}
          <div className="h-screen pointer-events-none" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
