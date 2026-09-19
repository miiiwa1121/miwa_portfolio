"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, X } from "lucide-react";
import { useLanguage } from "@/state/LanguageContext";
import { productPath, type Project } from "@/data";
import { statusLabel } from "./catalog";
import { CategoryBadge, StatusBadge } from "./Badges";
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
          className="absolute top-4 right-4 z-30 p-2.5 bg-white/90 hover:bg-white text-gray-800 hover:text-gray-950 rounded-full backdrop-blur-md shadow-md border border-black/10 transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="relative h-64 md:h-96 w-full shrink-0 border-b border-black/5 bg-gray-50">
          <Image
            src={project.image}
            alt={project.title}
            fill
            sizes="(min-width: 1024px) 1024px, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent"></div>
          <div className="absolute top-6 left-6 z-20">
            <StatusBadge size="lg" status={project.status} label={statusLabel(project.status, language)} />
          </div>
        </div>

        <div className="p-6 md:p-10 overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-3 sm:gap-4 mb-6">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-950 tracking-tight">
              {project.title}
            </h2>
            <CategoryBadge size="lg" category={project.category} />
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="font-bold mb-3 border-b border-black/5 pb-2 text-xs tracking-widest uppercase text-gray-500">
                Overview
              </h3>
              <p className="text-gray-700 text-base sm:text-lg leading-relaxed">{project.description}</p>
            </div>

            <div>
              <h3 className="font-bold mb-3 border-b border-black/5 pb-2 text-xs tracking-widest uppercase text-gray-500">
                Tech Stack
              </h3>
              <div className="flex flex-wrap gap-2">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1.5 bg-gray-50 border border-black/5 rounded-xl text-gray-700 text-sm font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-10 pt-6 border-t border-black/5">
            <ProjectLinks
              project={project}
              onBlocked={onBlockedLink}
              iconSize={18}
              codeLabel="View Code"
              demoLabel="Play Now"
              codeClassName="flex-1 py-3.5 sm:py-4 flex items-center justify-center gap-2 rounded-2xl bg-white hover:bg-gray-50 border border-black/10 text-gray-800 font-bold transition-all hover:scale-[1.01] active:scale-95 text-sm sm:text-base cursor-pointer"
              demoClassName="flex-1 py-3.5 sm:py-4 flex items-center justify-center gap-2 rounded-2xl bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold transition-all shadow-[0_4px_0_#9a3412] hover:shadow-[0_2px_0_#9a3412] hover:translate-y-[2px] active:shadow-none active:translate-y-1 text-sm sm:text-base cursor-pointer"
            />
            {/* The project's own page — the long write-up this modal only
                summarises. A route of this app, unlike Code/Play, so it is a
                next/link; the hub unmounts on the way, and the back button
                returns to #products. Same outline style as Code: Play stays
                the one filled button. */}
            <Link
              href={productPath(project.slug)}
              className="flex-1 py-3.5 sm:py-4 flex items-center justify-center gap-2 rounded-2xl bg-white hover:bg-gray-50 border border-black/10 text-gray-800 font-bold transition-all hover:scale-[1.01] active:scale-95 text-sm sm:text-base cursor-pointer whitespace-nowrap"
            >
              <BookOpen size={18} /> <span>Read More</span>
            </Link>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
