"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useLanguage } from "@/state/LanguageContext";
import type { Project } from "@/data";
import { statusLabel } from "./catalog";
import ProjectLinks, { type BlockedLink } from "./ProjectLinks";

type Props = {
  project: Project;
  onOpen: (project: Project) => void;
  onBlockedLink: (kind: BlockedLink) => void;
};

export default function ProjectCard({ project, onOpen, onBlockedLink }: Props) {
  const { language } = useLanguage();

  return (
    <motion.div
      whileHover={{ y: -5 }}
      onClick={() => onOpen(project)}
      className="group rounded-2xl bg-white border border-black/5 overflow-hidden flex flex-col hover:border-[var(--primary)]/50 transition-all duration-300 cursor-pointer"
    >
      <div className="relative w-full overflow-hidden h-48 bg-gray-50">
        <Image
          src={project.image}
          alt={project.title}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          className="object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute top-4 right-4 z-20">
          <div
            className={`w-3 h-3 rounded-full ${
              project.status === "Public"
                ? "bg-green-500 shadow-[0_0_10px_#22c55e]"
                : "bg-orange-500 shadow-[0_0_10px_#f97316]"
            }`}
            title={statusLabel(project.status, language)}
          />
        </div>
        {/* The blur is on the hover state, not on the hidden element. A
            `backdrop-filter` costs whether or not the thing carrying it is
            visible: eight of these live inside the sheet, and the sheet spends
            0.6–0.9s animating its own transform every time a detail page is
            opened or closed — over the same seconds the camera is flying. */}
        <div className="absolute bottom-2 left-2 z-20 bg-white/90 px-2 py-1 rounded opacity-0 group-hover:opacity-100 group-hover:backdrop-blur-sm transition-opacity">
          <span className="text-[10px] text-gray-600 font-bold tracking-widest uppercase">
            {language === "ja" ? "クリックで詳細" : "Click to view"}
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-6">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold text-gray-900 group-hover:text-[var(--primary)] transition-colors line-clamp-1">
            {project.title}
          </h3>
          <span
            className={`text-xs px-2 py-1 rounded-full font-bold shrink-0 ${
              project.category === "WEB"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {project.category}
          </span>
        </div>

        <p className="text-sm text-gray-600 mb-4 flex-1 line-clamp-2">{project.description}</p>

        <div className="flex flex-wrap gap-2 mb-6">
          {project.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">
              {tag}
            </span>
          ))}
          {project.tags.length > 3 && (
            <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">
              +{project.tags.length - 3}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 pt-3 border-t border-black/5 mt-auto justify-between">
          <ProjectLinks
            project={project}
            onBlocked={onBlockedLink}
            codeLabel="Code"
            demoLabel="Play"
            codeClassName="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors z-20 relative"
            demoClassName="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[var(--primary)] transition-colors z-20 relative"
          />
        </div>
      </div>
    </motion.div>
  );
}
