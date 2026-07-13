"use client";

import Section from "@/components/Section";
import { motion } from "framer-motion";

const experiences = [
  {
    year: "2023",
    title: "プログラミング学習を開始",
    description: "Web開発に興味を持ち、独学でHTML/CSS/JavaScriptを学び始める。",
  },
  {
    year: "2024",
    title: "React / Next.js の学習",
    description: "モダンなフロントエンド技術に触れ、個人開発でいくつかのプロダクトを作成。",
  },
  {
    year: "2025 - Present",
    title: "ポートフォリオ制作と就職活動準備",
    description: "自身のスキルを証明するため、このポートフォリオサイトを制作。27卒エンジニアとしてのキャリアをスタートさせるため活動中。",
  }
];

export default function Experience() {
  return (
    <Section id="experience" title="Experience">
      <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-[var(--primary)] before:via-[var(--secondary)] before:to-transparent">
        {experiences.map((exp, index) => (
          <motion.div 
            key={index}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#050505] bg-[var(--primary)] text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10">
              <div className="w-2 h-2 bg-[#050505] rounded-full" />
            </div>
            
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:border-[var(--primary)]/50 transition-colors">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-2 gap-2">
                <h3 className="font-bold text-white text-xl">{exp.title}</h3>
                <span className="text-[var(--primary)] font-mono text-sm font-semibold bg-[var(--primary)]/10 px-3 py-1 rounded-full w-fit">{exp.year}</span>
              </div>
              <p className="text-gray-400 leading-relaxed">{exp.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}
