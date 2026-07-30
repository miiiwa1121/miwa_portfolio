"use client";

import { Globe, Pause, Play } from "lucide-react";
import type { SectionType } from "@/types";
import { NAV } from "./nav";

type Props = {
  activeSection: SectionType;
  isJa: boolean;
  toggleLanguage: () => void;
  paused: boolean;
  togglePaused: () => void;
  onLogoClick: () => void;
  onNavClick: (id: NonNullable<SectionType>) => void;
};

export default function HubHeader({
  activeSection,
  isJa,
  toggleLanguage,
  paused,
  togglePaused,
  onLogoClick,
  onNavClick,
}: Props) {
  return (
    <header className="flex justify-between items-start w-full gap-6">
      {/* Logo → full reset. Text only, no frame/icon. */}
      <button
        onClick={onLogoClick}
        className="pointer-events-auto font-black text-gray-900 text-4xl sm:text-5xl tracking-tight hover:scale-[1.04] transition-transform [text-shadow:0_1px_5px_rgba(255,255,255,0.7)]"
      >
        Miiiwa<span className="text-orange-500">.</span>
      </button>

      {/* Nav + language */}
      <div className="flex items-center gap-4">
        <nav className="hidden lg:flex gap-2 pointer-events-auto bg-white/85 backdrop-blur-md px-3 py-3 rounded-full border border-black/5">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavClick(item.id)}
              className={`px-5 py-2.5 rounded-full text-lg font-bold transition-colors ${
                activeSection === item.id
                  ? "bg-orange-500 text-white"
                  : "text-gray-700 hover:text-orange-500 hover:bg-orange-50"
              }`}
            >
              {isJa ? item.ja : item.en}
            </button>
          ))}
        </nav>

        <button
          onClick={toggleLanguage}
          title="Toggle language"
          className="h-14 px-4 bg-white/85 backdrop-blur-md rounded-full flex items-center gap-2 text-gray-800 hover:scale-105 transition-transform border border-black/5 pointer-events-auto"
        >
          <Globe size={22} className="text-orange-500" />
          <span className="text-sm font-black w-6">{isJa ? "JP" : "EN"}</span>
        </button>

        {/* Freeze the town. Filled orange while stopped, the same "this
            toggle is on" language as the links button below. */}
        <button
          onClick={togglePaused}
          title={paused ? (isJa ? "動きを再生" : "Resume motion") : (isJa ? "動きを停止" : "Pause motion")}
          aria-label={paused ? (isJa ? "動きを再生" : "Resume motion") : (isJa ? "動きを停止" : "Pause motion")}
          aria-pressed={paused}
          className={`w-14 h-14 rounded-full flex items-center justify-center hover:scale-105 transition-transform border border-black/5 pointer-events-auto ${
            paused ? "bg-orange-500 text-white" : "bg-white/85 backdrop-blur-md text-gray-800"
          }`}
        >
          {paused ? (
            <Play size={20} fill="currentColor" />
          ) : (
            <Pause size={20} fill="currentColor" />
          )}
        </button>
      </div>
    </header>
  );
}
