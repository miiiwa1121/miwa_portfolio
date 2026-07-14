"use client";

import { useState, useEffect } from "react";
import Section from "@/components/Section";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { ExternalLink, X } from "lucide-react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useLanguage } from "../LanguageContext";

const GithubIcon = ({ size = 24 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
);

import { projectsJP, projectsEN, type Project } from "@/data";

const tabs = ["All", "WEB", "APP"];
const statuses = ["All", "Public", "dev"];

export default function Products() {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState("All");
  const [activeStatus, setActiveStatus] = useState("All");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [mounted, setMounted] = useState(false);

  const projects = language === "ja" ? projectsJP : projectsEN;

  const filteredProjects = projects.filter(
    project => (activeTab === "All" || project.category === activeTab) && 
               (activeStatus === "All" || project.status === activeStatus)
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
      setToastMessage(language === "ja" ? "これは秘密だぜ🤫" : "This is a secret🤫");
      setTimeout(() => setToastMessage(null), 3000); 
    }
  };

  const handlePlayClick = (e: React.MouseEvent, url: string) => {
    e.stopPropagation(); 
    if (url === "#" || !url) {
      e.preventDefault(); 
      setToastMessage("Coming soon ...");
      setTimeout(() => setToastMessage(null), 3000); 
    }
  };

  const getStatusLabel = (status: string) => {
    if (language === 'en') return status;
    switch (status) {
      case "All": return "すべて";
      case "Public": return "公開中";
      case "dev": return "開発中";
      default: return status;
    }
  };

  return (
    <Section id="products" title="Products">
      {/* Header controls */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
        {/* Category Tabs */}
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

        {/* Status Tabs */}
        <div className="flex gap-2 p-1.5 bg-white/5 rounded-full border border-white/10 ml-auto mr-auto md:mr-0 w-full md:w-auto overflow-x-auto custom-scrollbar">
          {statuses.map(status => (
            <button
              key={status}
              onClick={() => setActiveStatus(status)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-300 ${
                activeStatus === status 
                  ? "bg-[var(--primary)] text-[#050505] shadow-[0_0_10px_var(--primary)]" 
                  : "text-gray-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <div className="flex items-center gap-2">
                {status !== "All" && (
                  <div className={`w-2 h-2 rounded-full ${
                    status === "Public" ? "bg-green-500 shadow-[0_0_8px_#22c55e]" : "bg-orange-500 shadow-[0_0_8px_#f97316]"
                  }`} />
                )}
                <span>{getStatusLabel(status)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 transition-all duration-500">
        {filteredProjects.map((project) => (
          <motion.div
            key={project.id}
            whileHover={{ y: -5 }}
            onClick={() => setSelectedProject(project)}
            className="group rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex flex-col backdrop-blur-sm hover:border-[var(--primary)]/50 transition-all duration-300 cursor-pointer"
          >
              <div className="relative w-full overflow-hidden h-48">
                <div className="absolute inset-0 bg-[var(--primary)]/20 group-hover:opacity-0 transition-opacity z-10 mix-blend-overlay"></div>
                <Image 
                  src={project.image} 
                  alt={project.title} 
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-4 right-4 z-20">
                  <div className={`w-3 h-3 rounded-full ${
                    project.status === "Public" 
                      ? "bg-green-500 shadow-[0_0_10px_#22c55e]" 
                      : "bg-orange-500 shadow-[0_0_10px_#f97316]"
                  }`} title={getStatusLabel(project.status)} />
                </div>
                <div className="absolute bottom-2 left-2 z-20 bg-black/50 px-2 py-1 rounded backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">{language === 'ja' ? 'クリックで詳細' : 'Click to view'}</span>
                </div>
              </div>
              <div className="flex-1 flex flex-col p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-white group-hover:text-[var(--primary)] transition-colors line-clamp-1">{project.title}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full font-bold shrink-0 ${
                    project.category === "WEB" 
                      ? "bg-green-500/20 text-green-400" 
                      : "bg-red-500/20 text-red-400"
                  }`}>{project.category}</span>
                </div>
                
                <p className="text-sm text-gray-400 mb-4 flex-1 line-clamp-2">
                  {project.description}
                </p>
                
                <div className="flex flex-wrap gap-2 mb-6">
                  {project.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="text-xs px-2 py-1 bg-white/10 rounded text-gray-300">
                      {tag}
                    </span>
                  ))}
                  {project.tags.length > 3 && <span className="text-xs px-2 py-1 bg-white/10 rounded text-gray-300">+{project.tags.length - 3}</span>}
                </div>
                
                <div className="flex items-center gap-2 pt-3 border-t border-white/10 mt-auto justify-between">
                  <Link 
                    href={project.githubUrl} 
                    onClick={(e) => handleCodeClick(e, project.githubUrl)}
                    target={project.githubUrl !== "#" ? "_blank" : undefined}
                    className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors z-20 relative"
                  >
                    <GithubIcon size={16} /> <span>Code</span>
                  </Link>
                  <Link 
                    href={project.demoUrl} 
                    onClick={(e) => handlePlayClick(e, project.demoUrl)}
                    target={project.demoUrl !== "#" ? "_blank" : undefined}
                    className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-[var(--primary)] transition-colors z-20 relative"
                  >
                    <ExternalLink size={16} /> <span>Play</span>
                  </Link>
                </div>
              </div>
            </motion.div>
        ))}
      </div>

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
                  <div className="absolute top-6 left-6 z-20">
                    <span className={`flex items-center gap-2 text-sm font-bold px-4 py-1.5 rounded-full border backdrop-blur-md ${
                      selectedProject.status === "Public" 
                        ? "bg-green-500/10 text-green-400 border-green-500/30" 
                        : "bg-orange-500/10 text-orange-400 border-orange-500/30"
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        selectedProject.status === "Public" ? "bg-green-500 shadow-[0_0_8px_#22c55e]" : "bg-orange-500 shadow-[0_0_8px_#f97316]"
                      }`} />
                      {getStatusLabel(selectedProject.status)}
                    </span>
                  </div>
                </div>

                <div className="p-6 md:p-10 overflow-y-auto custom-scrollbar">
                  <div className="flex items-center gap-4 mb-6">
                    <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter">{selectedProject.title}</h2>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      selectedProject.category === "WEB" 
                        ? "bg-green-500/10 text-green-400 border-green-500/30" 
                        : "bg-red-500/10 text-red-400 border-red-500/30"
                    }`}>
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
                      onClick={(e) => handlePlayClick(e, selectedProject.demoUrl)}
                      target={selectedProject.demoUrl !== "#" ? "_blank" : undefined}
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
