"use client";

import { motion } from "framer-motion";

/** Transient message pinned to the bottom of the viewport. */
export default function Toast({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, x: "-50%" }}
      animate={{ opacity: 1, y: 0, x: "-50%" }}
      exit={{ opacity: 0, y: 50, x: "-50%" }}
      role="status"
      className="fixed bottom-10 left-1/2 z-[9999] px-6 py-3 rounded-full bg-white border border-[var(--primary)] text-[var(--primary)] font-bold shadow-xl backdrop-blur-md whitespace-nowrap"
    >
      {children}
    </motion.div>
  );
}
