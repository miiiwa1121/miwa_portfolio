"use client";

import { useState } from "react";
import { Monitor, Terminal } from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { GithubIcon, XIcon } from "@/ui/icons";
import Footer from "./Footer";

type Props = {
  isJa: boolean;
  openTerminal: () => void;
  pageOpen: boolean;
};

const containerVariants: Variants = {
  hidden: {
    opacity: 0,
    transition: {
      staggerChildren: 0.04,
      staggerDirection: -1,
      when: "afterChildren",
    },
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.03,
    },
  },
};

const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.2,
    x: -24,
    filter: "blur(4px)",
    transition: {
      duration: 0.18,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  visible: {
    opacity: 1,
    scale: 1,
    x: 0,
    filter: "blur(0px)",
    transition: {
      type: "spring",
      stiffness: 480,
      damping: 22,
      mass: 0.8,
    },
  },
};

export default function HubDock({ isJa, openTerminal, pageOpen }: Props) {
  const [toolsOpen, setToolsOpen] = useState(false);

  return (
    <div className="flex justify-between items-end w-full gap-4">
      {/* Links tucked behind a PC icon — revealed on hover (or tap) with spring stagger animation */}
      <div
        className="flex items-center pointer-events-auto"
        onMouseEnter={() => setToolsOpen(true)}
        onMouseLeave={() => setToolsOpen(false)}
      >
        <motion.button
          onClick={() => setToolsOpen((o) => !o)}
          title={isJa ? "リンク" : "Links"}
          aria-expanded={toolsOpen}
          aria-label={isJa ? "リンク" : "Links"}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          animate={{
            rotate: toolsOpen ? 8 : 0,
          }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors border border-black/5 shadow-sm ${toolsOpen
              ? "bg-orange-600 text-white shadow-md shadow-orange-600/25"
              : "bg-white text-gray-800 hover:bg-white"
            }`}
        >
          <Monitor size={19} />
        </motion.button>

        <AnimatePresence>
          {toolsOpen && (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="flex items-center gap-2 ml-2.5"
            >
              <motion.a
                variants={itemVariants}
                whileHover={{ scale: 1.15, y: -2 }}
                whileTap={{ scale: 0.92 }}
                href="https://github.com/miiiwa1121"
                target="_blank"
                rel="noopener noreferrer"
                title="GitHub"
                aria-label="GitHub"
                className="w-11 h-11 bg-white rounded-full flex items-center justify-center text-gray-800 hover:text-gray-950 hover:bg-white transition-colors border border-black/5 shadow-sm hover:shadow-md shrink-0"
              >
                <GithubIcon size={19} />
              </motion.a>

              <motion.a
                variants={itemVariants}
                whileHover={{ scale: 1.15, y: -2 }}
                whileTap={{ scale: 0.92 }}
                href="https://x.com/miiiwa3330"
                target="_blank"
                rel="noopener noreferrer"
                title="X"
                aria-label="X"
                className="w-11 h-11 bg-white rounded-full flex items-center justify-center text-gray-900 hover:bg-white transition-colors border border-black/5 shadow-sm hover:shadow-md shrink-0"
              >
                <XIcon size={17} />
              </motion.a>

              <motion.button
                variants={itemVariants}
                whileHover={{ scale: 1.15, y: -2 }}
                whileTap={{ scale: 0.92 }}
                onClick={openTerminal}
                title="Terminal mode"
                aria-label="Terminal mode"
                className="w-11 h-11 bg-white rounded-full flex items-center justify-center text-emerald-600 hover:text-emerald-700 hover:bg-white transition-colors border border-black/5 shadow-sm hover:shadow-md shrink-0"
              >
                <Terminal size={19} />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer (only on Home screen, bottom right) */}
      <div className="absolute bottom-9 right-12 pointer-events-auto">
        {!pageOpen && <Footer />}
      </div>
    </div>
  );
}

