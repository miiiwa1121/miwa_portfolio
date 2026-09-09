"use client";

import { useState } from "react";
import { Monitor, Terminal } from "lucide-react";
import { GithubIcon, XIcon } from "@/ui/icons";
import Footer from "./Footer";

type Props = {
  isJa: boolean;
  openTerminal: () => void;
  pageOpen: boolean;
};

export default function HubDock({ isJa, openTerminal, pageOpen }: Props) {
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
          aria-label={isJa ? "リンク" : "Links"}
          className={`w-11 h-11 rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all border border-black/5 shadow-sm backdrop-blur-md ${
            toolsOpen ? "bg-orange-600 text-white" : "bg-white/90 text-gray-800 hover:bg-white"
          }`}
        >
          <Monitor size={19} />
        </button>
        {toolsOpen && (
          <div className="flex items-center gap-2 ml-2 animate-[fadeIn_0.25s_ease]">
            <a
              href="https://github.com/miiiwa1121"
              target="_blank"
              rel="noopener noreferrer"
              title="GitHub"
              aria-label="GitHub"
              className="w-11 h-11 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-gray-800 hover:text-gray-950 hover:bg-white hover:scale-110 active:scale-95 transition-all border border-black/5 shadow-sm shrink-0"
            >
              <GithubIcon size={19} />
            </a>
            <a
              href="https://x.com/miiiwa3330"
              target="_blank"
              rel="noopener noreferrer"
              title="X"
              aria-label="X"
              className="w-11 h-11 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-gray-900 hover:bg-white hover:scale-110 active:scale-95 transition-all border border-black/5 shadow-sm shrink-0"
            >
              <XIcon size={17} />
            </a>
            <button
              onClick={openTerminal}
              title="Terminal mode"
              aria-label="Terminal mode"
              className="w-11 h-11 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-emerald-600 hover:text-emerald-700 hover:bg-white hover:scale-110 active:scale-95 transition-all border border-black/5 shadow-sm shrink-0"
            >
              <Terminal size={19} />
            </button>
          </div>
        )}
      </div>

      {/* Footer (only on Home screen, bottom right) */}
      <div className="absolute bottom-9 right-12 pointer-events-auto">
        {!pageOpen && <Footer />}
      </div>
    </div>
  );
}
