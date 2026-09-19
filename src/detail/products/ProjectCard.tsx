"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useLanguage } from "@/state/LanguageContext";
import type { Project } from "@/data";
import { CARD_TAG_COUNT, statusLabel } from "./catalog";
import { CategoryBadge, StatusBadge } from "./Badges";
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
      whileHover={{ y: -4 }}
      onClick={() => onOpen(project)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(project);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${project.title} - ${language === "ja" ? "詳細を見る" : "View details"}`}
      className="group rounded-3xl bg-white border border-black/5 overflow-hidden flex flex-col hover:border-orange-300 shadow-sm hover:shadow-xl hover:shadow-black/5 transition-all duration-300 cursor-pointer text-left select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
    >
      <div className="relative w-full overflow-hidden h-48 bg-gray-50">
        <Image
          src={project.image}
          alt={project.title}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3.5 right-3.5 z-20">
          <StatusBadge status={project.status} label={statusLabel(project.status, language)} />
        </div>

        <div className="absolute bottom-2.5 left-2.5 z-20 bg-white/90 px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 group-hover:backdrop-blur-sm transition-opacity shadow-sm">
          <span className="text-[10px] text-gray-700 font-bold tracking-widest uppercase">
            {language === "ja" ? "クリックで詳細" : "Click to view"}
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-6">
        <div className="flex justify-between items-start mb-2 gap-2">
          <h3 className="text-xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-1">
            {project.title}
          </h3>
          <CategoryBadge category={project.category} />
        </div>

        <p className="text-sm text-gray-600 mb-4 flex-1 line-clamp-2 leading-relaxed">
          {project.description}
        </p>

        <div className="flex flex-wrap gap-1.5 mb-6">
          {project.tags.slice(0, CARD_TAG_COUNT).map((tag) => (
            <span key={tag} className="text-xs px-2.5 py-1 bg-gray-50 border border-black/5 rounded-lg text-gray-600 font-medium">
              {tag}
            </span>
          ))}
          {project.tags.length > CARD_TAG_COUNT && (
            <span className="text-xs px-2.5 py-1 bg-gray-50 border border-black/5 rounded-lg text-gray-500 font-medium">
              +{project.tags.length - CARD_TAG_COUNT}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 pt-3 border-t border-black/5 mt-auto justify-between">
          <ProjectLinks
            project={project}
            onBlocked={onBlockedLink}
            codeLabel="Code"
            demoLabel="Play"
            codeClassName="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-950 transition-colors z-20 relative px-2.5 py-1.5 rounded-lg hover:bg-gray-100"
            demoClassName="flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors z-20 relative px-2.5 py-1.5 rounded-lg hover:bg-orange-50"
          />
        </div>
      </div>
    </motion.div>
  );
}
