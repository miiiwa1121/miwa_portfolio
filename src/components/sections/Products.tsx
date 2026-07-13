"use client";

import { useState, useEffect } from "react";
import Section from "@/components/Section";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { ExternalLink, X } from "lucide-react";
import Link from "next/link";
import { createPortal } from "react-dom";

const GithubIcon = ({ size = 24 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
);

const DynamicGridIcon = ({ cols, size = 24, className = "" }: { cols: number, size?: number, className?: string }) => {
  const gap = 2;
  const padding = 2;
  const availableSpace = 24 - padding * 2 - gap * (cols - 1);
  const rectSize = availableSpace / cols;
  
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      {Array.from({ length: cols * cols }).map((_, i) => {
        const row = Math.floor(i / cols);
        const col = i % cols;
        return (
          <rect
            key={i}
            x={padding + col * (rectSize + gap)}
            y={padding + row * (rectSize + gap)}
            width={rectSize}
            height={rectSize}
            fill="currentColor"
            rx={cols > 4 ? 0 : 1}
          />
        );
      })}
    </svg>
  );
};

type Project = {
  id: number;
  title: string;
  description: string;
  image: string;
  tags: string[];
  category: string;
  githubUrl: string;
  demoUrl: string;
};

// 9x9のレイアウトも見れるようにプロジェクト数を増やす
const dummyProjects: Project[] = Array.from({ length: 18 }).map((_, i) => ({
  id: i + 1,
  title: `Product Name ${i + 1}`,
  description: "ダミーのプロダクト概要です。実際の実績詳細が決まり次第、ここに内容を反映します。このプロジェクトでは、最新のモダンな技術を活用し、高いパフォーマンスと優れたUXを実現することを目指しました。",
  image: "/images/project_placeholder.png",
  tags: ["Next.js", "Tailwind CSS", "TypeScript"],
  category: i % 2 === 0 ? "WEB" : "APP",
  githubUrl: "#",
  demoUrl: "https://example.com"
}));

const tabs = ["All", "WEB", "APP"];

const layoutClassMap: Record<number, string> = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
};

export default function Products() {
  const [activeTab, setActiveTab] = useState("All");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [layoutCols, setLayoutCols] = useState<2 | 3 | 4>(3);

  const [mounted, setMounted] = useState(false);

  const filteredProjects = dummyProjects.filter(
    project => activeTab === "All" || project.category === activeTab
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (selectedProject) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [selectedProject]);

  const handleCodeClick = (e: React.MouseEvent, url: string) => {
    e.stopPropagation(); 
    if (url === "#" || !url) {
      e.preventDefault(); 
      setToastMessage("これは秘密だぜ🤫");
      setTimeout(() => setToastMessage(null), 3000); 
    }
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation(); 
  };

  return (
    <Section id="products" title="Products">
      {/* Header controls */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
        {/* Tabs */}
        <div className="flex gap-4 justify-center md:justify-start w-full md:w-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-full font-bold transition-all duration-300 ${
                activeTab === tab 
                  ? "bg-[var(--primary)] text-[#050505] shadow-[0_0_15px_var(--primary)] border-transparent" 
                  : "bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Layout Toggles */}
        <div className="flex gap-3 p-1.5 bg-white/5 rounded-xl border border-white/10 ml-auto mr-auto md:mr-0">
          {([2, 3, 4] as const).map(cols => (
            <button
              key={cols}
              onClick={() => setLayoutCols(cols)}
              className={`p-2 rounded-lg transition-all duration-300 ${
                layoutCols === cols 
                  ? "bg-[var(--primary)] text-[#050505] shadow-[0_0_10px_var(--primary)]" 
                  : "text-gray-400 hover:text-white hover:bg-white/10"
              }`}
              title={`${cols}x${cols} Layout`}
            >
              <DynamicGridIcon cols={cols} size={20} />
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <motion.div layout className={`grid gap-4 md:gap-8 transition-all duration-500 ${layoutClassMap[layoutCols]}`}>
        <AnimatePresence mode="popLayout">
          {filteredProjects.map((project) => (
            <motion.div
              layout
              key={project.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              whileHover={{ y: -5 }}
              onClick={() => setSelectedProject(project)}
              className="group rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex flex-col backdrop-blur-sm hover:border-[var(--primary)]/50 transition-all duration-300 cursor-pointer"
            >
              <div className={`relative w-full overflow-hidden ${layoutCols === 4 ? 'h-32' : 'h-48'}`}>
                <div className="absolute inset-0 bg-[var(--primary)]/20 group-hover:opacity-0 transition-opacity z-10 mix-blend-overlay"></div>
                <Image 
                  src={project.image} 
                  alt={project.title} 
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <div className={`flex-1 flex flex-col p-6`}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className={`text-xl font-bold text-white group-hover:text-[var(--primary)] transition-colors line-clamp-1`}>{project.title}</h3>
                  <span className="text-xs px-2 py-1 bg-white/10 rounded-full text-[var(--primary)] font-bold">{project.category}</span>
                </div>
                
                <p className={`text-sm text-gray-400 mb-4 flex-1 ${layoutCols === 4 ? 'line-clamp-1' : 'line-clamp-2'}`}>
                  {project.description}
                </p>
                
                {layoutCols === 2 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {project.tags.map(tag => (
                      <span key={tag} className="text-xs px-2 py-1 bg-white/10 rounded text-gray-300">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                
                <div className={`flex items-center gap-2 pt-3 border-t border-white/10 mt-auto justify-between`}>
                  <Link 
                    href={project.githubUrl} 
                    onClick={(e) => handleCodeClick(e, project.githubUrl)}
                    target={project.githubUrl !== "#" ? "_blank" : undefined}
                    className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors z-20 relative"
                  >
                    <GithubIcon size={16} /> <span className={layoutCols === 4 ? 'hidden lg:inline' : ''}>Code</span>
                  </Link>
                  <Link 
                    href={project.demoUrl} 
                    onClick={handlePlayClick}
                    target="_blank"
                    className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-[var(--primary)] transition-colors z-20 relative"
                  >
                    <ExternalLink size={16} /> <span className={layoutCols === 4 ? 'hidden lg:inline' : ''}>Play</span>
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Secret Toast Message */}
      {mounted && createPortal(
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 50, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: 50, x: "-50%" }}
              className="fixed bottom-10 left-1/2 z-[9999] px-6 py-3 rounded-full bg-black/90 border border-[var(--primary)] text-[var(--primary)] font-bold shadow-[0_0_20px_var(--primary)] backdrop-blur-md whitespace-nowrap"
            >
              {toastMessage}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Product Detail Modal */}
      {mounted && createPortal(
        <AnimatePresence>
          {selectedProject && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProject(null)}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()} 
                className="relative w-full max-w-5xl bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
              >
                <button 
                  onClick={() => setSelectedProject(null)}
                  className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-[var(--primary)] hover:text-black text-white rounded-full backdrop-blur-md transition-colors"
                >
                  <X size={20} />
                </button>

                <div className="relative h-64 md:h-96 w-full shrink-0 border-b border-white/5">
                  <Image 
                    src={selectedProject.image} 
                    alt={selectedProject.title} 
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/50 to-transparent"></div>
                </div>

                <div className="p-6 md:p-10 overflow-y-auto custom-scrollbar">
                  <div className="flex items-center gap-4 mb-6">
                    <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter">{selectedProject.title}</h2>
                    <span className="px-3 py-1 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full text-xs font-bold border border-[var(--primary)]/30">
                      {selectedProject.category}
                    </span>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-white font-bold mb-3 border-b border-white/10 pb-2 text-sm tracking-widest uppercase text-gray-500">Overview</h3>
                      <p className="text-gray-300 text-lg leading-relaxed">
                        {selectedProject.description}
                      </p>
                    </div>

                    <div>
                      <h3 className="text-white font-bold mb-3 border-b border-white/10 pb-2 text-sm tracking-widest uppercase text-gray-500">Tech Stack</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedProject.tags.map(tag => (
                          <span key={tag} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-gray-300 text-sm font-medium">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 mt-12 pt-6 border-t border-white/10">
                    <Link 
                      href={selectedProject.githubUrl} 
                      onClick={(e) => handleCodeClick(e, selectedProject.githubUrl)}
                      target={selectedProject.githubUrl !== "#" ? "_blank" : undefined}
                      className="flex-1 py-4 flex items-center justify-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/20 text-white font-bold transition-all hover:scale-[1.02]"
                    >
                      <GithubIcon size={20} /> View Code
                    </Link>
                    <Link 
                      href={selectedProject.demoUrl} 
                      onClick={handlePlayClick}
                      target="_blank"
                      className="flex-1 py-4 flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 border border-[var(--primary)]/50 text-[var(--primary)] font-bold transition-all hover:scale-[1.02] shadow-[0_0_15px_rgba(0,240,255,0.1)] hover:shadow-[0_0_20px_rgba(0,240,255,0.3)]"
                    >
                      <ExternalLink size={20} /> Play Now
                    </Link>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </Section>
  );
}
