"use client";

import { useState } from "react";
import Section from "@/components/Section";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

const GithubIcon = ({ size = 24 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
);

const dummyProjects = Array.from({ length: 6 }).map((_, i) => ({
  id: i + 1,
  title: `Product Name ${i + 1}`,
  description: "ダミーのプロダクト概要です。実際の実績詳細が決まり次第、ここに内容を反映します。",
  image: "/images/project_placeholder.png",
  tags: ["Next.js", "Tailwind CSS", "TypeScript"],
  category: i % 2 === 0 ? "WEB" : "APP",
  githubUrl: "#",
  demoUrl: "#"
}));

const tabs = ["All", "WEB", "APP"];

export default function Products() {
  const [activeTab, setActiveTab] = useState("All");

  const filteredProjects = dummyProjects.filter(
    project => activeTab === "All" || project.category === activeTab
  );

  return (
    <Section id="products" title="Products">
      {/* Tabs */}
      <div className="flex gap-4 mb-8 justify-center md:justify-start">
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

      {/* Grid */}
      <motion.div layout className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence mode="popLayout">
          {filteredProjects.map((project) => (
            <motion.div
              layout
              key={project.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              whileHover={{ y: -10 }}
              className="group rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex flex-col backdrop-blur-sm hover:border-[var(--primary)]/50 transition-all duration-300"
            >
              <div className="relative h-48 w-full overflow-hidden">
                <div className="absolute inset-0 bg-[var(--primary)]/20 group-hover:opacity-0 transition-opacity z-10 mix-blend-overlay"></div>
                <Image 
                  src={project.image} 
                  alt={project.title} 
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-white group-hover:text-[var(--primary)] transition-colors">{project.title}</h3>
                  <span className="text-xs px-2 py-1 bg-white/10 rounded-full text-[var(--primary)] font-bold">{project.category}</span>
                </div>
                <p className="text-sm text-gray-400 mb-4 flex-1">{project.description}</p>
                
                <div className="flex flex-wrap gap-2 mb-6">
                  {project.tags.map(tag => (
                    <span key={tag} className="text-xs px-2 py-1 bg-white/10 rounded text-gray-300">
                      {tag}
                    </span>
                  ))}
                </div>
                
                <div className="flex items-center gap-4 pt-4 border-t border-white/10 mt-auto">
                  <Link href={project.githubUrl} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
                    <GithubIcon size={16} /> Code
                  </Link>
                  <Link href={project.demoUrl} className="flex items-center gap-2 text-sm text-gray-400 hover:text-[var(--primary)] transition-colors ml-auto">
                    <ExternalLink size={16} /> Live Demo
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </Section>
  );
}
