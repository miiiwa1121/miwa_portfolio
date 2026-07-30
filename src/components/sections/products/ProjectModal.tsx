"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { X } from "lucide-react";
import { useLanguage } from "@/components/LanguageContext";
import type { Project } from "@/data";
import { statusLabel } from "./catalog";
import ProjectLinks, { type BlockedLink } from "./ProjectLinks";

type Props = {
  project: Project;
  onClose: () => void;
  onBlockedLink: (kind: BlockedLink) => void;
};

export default function ProjectModal({ project, onClose, onBlockedLink }: Props) {
  const { language } = useLanguage();

  // Escape closes. The dialog is the topmost layer, so this listener only
  // exists while it is mounted.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={project.title}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl bg-white border border-black/5 rounded-3xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <button
          onClick={onClose}
          aria-label={language === "ja" ? "閉じる" : "Close"}
          className="absolute top-4 right-4 z-10 p-2 bg-white/85 hover:bg-orange-500 hover:text-white text-gray-800 rounded-full backdrop-blur-md transition-colors"
        >
          <X size={20} />
        </button>

        <div className="relative h-64 md:h-96 w-full shrink-0 border-b border-black/5 bg-gray-50">
          <Image
            src={project.image}
            alt={project.title}
            fill
            sizes="(min-width: 1024px) 1024px, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/30 to-transparent"></div>
          <div className="absolute top-6 left-6 z-20">
            <span
              className={`flex items-center gap-2 text-sm font-bold px-4 py-1.5 rounded-full border backdrop-blur-md ${
                project.status === "Public"
                  ? "bg-green-50/90 text-green-700 border-green-600/30"
                  : "bg-orange-50/90 text-orange-700 border-orange-600/30"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  project.status === "Public"
                    ? "bg-green-500 shadow-[0_0_8px_#22c55e]"
                    : "bg-orange-500 shadow-[0_0_8px_#f97316]"
                }`}
              />
              {statusLabel(project.status, language)}
            </span>
          </div>
        </div>

        <div className="p-6 md:p-10 overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-4 mb-6">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tighter">
              {project.title}
            </h2>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                project.category === "WEB"
                  ? "bg-green-50 text-green-700 border-green-600/30"
                  : "bg-red-50 text-red-700 border-red-600/30"
              }`}
            >
              {project.category}
            </span>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="font-bold mb-3 border-b border-black/10 pb-2 text-sm tracking-widest uppercase text-gray-500">
                Overview
              </h3>
              <p className="text-gray-700 text-lg leading-relaxed">{project.description}</p>
            </div>

            <div>
              <h3 className="font-bold mb-3 border-b border-black/10 pb-2 text-sm tracking-widest uppercase text-gray-500">
                Tech Stack
              </h3>
              <div className="flex flex-wrap gap-2">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1.5 bg-gray-50 border border-black/10 rounded-lg text-gray-700 text-sm font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-4 mt-12 pt-6 border-t border-black/10">
            <ProjectLinks
              project={project}
              onBlocked={onBlockedLink}
              iconSize={20}
              codeLabel="View Code"
              demoLabel="Play Now"
              codeClassName="flex-1 py-4 flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-gray-50 border border-black/10 text-gray-800 font-bold transition-all hover:scale-[1.02]"
              demoClassName="flex-1 py-4 flex items-center justify-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold transition-all shadow-[0_4px_0_var(--primary-strong)] active:shadow-none active:translate-y-1"
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
