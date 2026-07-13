"use client";

import Section from "@/components/Section";
import { motion } from "framer-motion";
import Image from "next/image";
import { ExternalLink } from "lucide-react";

const GithubIcon = ({ size = 24 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
);
import Link from "next/link";

const dummyProjects = Array.from({ length: 6 }).map((_, i) => ({
  id: i + 1,
  title: `Project Name ${i + 1}`,
  description: "ダミーのプロジェクト概要です。実際の実績詳細が決まり次第、ここに内容を反映します。モダンでリッチなUIを持ったWebアプリケーションを想定しています。",
  image: "/images/project_placeholder.png",
  tags: ["Next.js", "Tailwind CSS", "TypeScript"],
  githubUrl: "#",
  demoUrl: "#"
}));

export default function Works() {
  return (
    <Section id="works" title="Works">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {dummyProjects.map((project, index) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
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
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[var(--primary)] transition-colors">{project.title}</h3>
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
      </div>
    </Section>
  );
}
