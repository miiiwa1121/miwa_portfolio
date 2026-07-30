"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Monitor, Terminal } from "lucide-react";
import { GithubIcon, XIcon } from "@/ui/icons";
import About from "./about/About";
import Footer from "./Footer";
import type { SectionType } from "@/types";

type Props = {
  isJa: boolean;
  openTerminal: () => void;
  pageOpen: boolean;
  activeSection: SectionType;
  onAboutFinish: () => void;
};

export default function HubDock({ isJa, openTerminal, pageOpen, activeSection, onAboutFinish }: Props) {
  const [toolsOpen, setToolsOpen] = useState(false);

  return (
    <div className="flex justify-between items-end w-full gap-4">
      {/* Links tucked behind a PC icon — revealed on hover (or tap) */}
      <div
        className="flex items-center pointer-events-auto"
        onMouseEnter={() => setToolsOpen(true)}
        onMouseLeave={() => setToolsOpen(false)}
      >
        <button
          onClick={() => setToolsOpen((o) => !o)}
          title={isJa ? "リンク" : "Links"}
          aria-expanded={toolsOpen}
          className={`w-11 h-11 rounded-full flex items-center justify-center hover:scale-110 transition-all border border-black/5 ${
            toolsOpen ? "bg-orange-500 text-white" : "bg-white/85 backdrop-blur-md text-gray-800"
          }`}
        >
          <Monitor size={20} />
        </button>
        {toolsOpen && (
          <div className="flex items-center gap-2 ml-2 animate-[fadeIn_0.25s_ease]">
            <a
              href="https://github.com/miiiwa1121"
              target="_blank"
              rel="noopener noreferrer"
              title="GitHub"
              className="w-11 h-11 bg-white/85 backdrop-blur-md rounded-full flex items-center justify-center text-gray-800 hover:scale-110 transition-transform border border-black/5 shrink-0"
            >
              <GithubIcon size={20} />
            </a>
            <a
              href="https://x.com/miiiwa3330"
              target="_blank"
              rel="noopener noreferrer"
              title="X"
              className="w-11 h-11 bg-white/85 backdrop-blur-md rounded-full flex items-center justify-center text-gray-900 hover:scale-110 transition-transform border border-black/5 shrink-0"
            >
              <XIcon size={18} />
            </a>
            <button
              onClick={openTerminal}
              title="Terminal mode"
              className="w-11 h-11 bg-white/85 backdrop-blur-md rounded-full flex items-center justify-center text-green-600 hover:scale-110 transition-transform border border-black/5 shrink-0"
            >
              <Terminal size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Floating About section for home screen — left side, frameless,
          mirrored by the camera flight in Scene.tsx pushing the about
          building over to the right of the frame to clear it. Indented
          well past the logo (reference/image2.png), not flush to the
          edge, so it reads as a placed column rather than a margin note.
          Full height, top edge to bottom edge: the text is meant to run
          off both ends of the screen and be scrolled up through them. */}
      <div className="absolute left-[15%] inset-y-0 pointer-events-none z-30">
        <AnimatePresence>
          {!pageOpen && activeSection === "about" && (
            // `onAboutFinish` (closePage), not a fly-home. The scroll that
            // carried the text off the screen carried the camera home with
            // it (see the About branch of Scene's frame loop), so by now it
            // is already in the home framing, and a flight would only be a
            // second arrival on top of the one the reader just made. Facing
            // is published by the scene from the angle it actually stopped at.
            <About onFinish={onAboutFinish} />
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
