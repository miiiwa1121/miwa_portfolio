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
          className={`w-11 h-11 rounded-full flex items-center justify-center hover:scale-110 transition-all border border-black/5 ${
            toolsOpen ? "bg-orange-500 text-white" : "bg-white text-gray-800"
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
              className="w-11 h-11 bg-white rounded-full flex items-center justify-center text-gray-800 hover:scale-110 transition-transform border border-black/5 shrink-0"
            >
              <GithubIcon size={20} />
            </a>
            <a
              href="https://x.com/miiiwa3330"
              target="_blank"
              rel="noopener noreferrer"
              title="X"
              className="w-11 h-11 bg-white rounded-full flex items-center justify-center text-gray-900 hover:scale-110 transition-transform border border-black/5 shrink-0"
            >
              <XIcon size={18} />
            </a>
            <button
              onClick={openTerminal}
              title="Terminal mode"
              className="w-11 h-11 bg-white rounded-full flex items-center justify-center text-green-600 hover:scale-110 transition-transform border border-black/5 shrink-0"
            >
              <Terminal size={20} />
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
