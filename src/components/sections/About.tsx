"use client";

import Section from "@/components/Section";
import { Terminal, Code, Cpu } from "lucide-react";
import { useLanguage } from "../LanguageContext";

export default function About() {
  const { language } = useLanguage();
  
  const t = {
    title: language === "ja" ? "About" : "About Me",
    p1: language === "ja" 
      ? <>初めまして、<span className="text-white font-bold">Miiiwa</span>です。<br className="hidden md:block" />「面白いを最優先！」をモットーに、日々新しい技術に触れながらプロダクト開発に挑戦している駆け出し学生エンジニア（27卒）です。</>
      : <>Hello, I'm <span className="text-white font-bold">Miiiwa</span>.<br className="hidden md:block" />A junior student engineer (Class of '27) challenging product development every day with the motto "Fun First!".</>,
    p2: language === "ja"
      ? "ただ動くものを作るだけでなく、ユーザーにとって「使ってて楽しい」「デザインがカッコいい」と思えるような体験（UX）を提供することを大切にしています。"
      : "I don't just build things that work. I value providing an experience (UX) that makes users feel 'this is fun to use' and 'the design is cool'.",
    p3: language === "ja"
      ? "とにかく新規性重視で、まだこの世にないものを探し求めて、日々を過ごしています！"
      : "I strongly focus on novelty, always searching for things that don't exist in this world yet!",
    frontendDesc: language === "ja" ? "React, Next.js を用いたモダンなUI構築" : "Modern UI development using React, Next.js",
    designDesc: language === "ja" ? "Tailwind CSS, Framer Motion によるリッチな表現" : "Rich visual expressions with Tailwind CSS & Framer Motion",
    challengeDesc: language === "ja" ? "常に新しい技術や「面白い」アイデアに挑戦" : "Constantly challenging new tech and 'fun' ideas"
  };
  return (
    <Section id="about" title={t.title}>
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6 text-gray-300 leading-relaxed text-lg">
          <p>{t.p1}</p>
          <p>{t.p2}</p>
          <p>{t.p3}</p>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm flex items-start gap-4 hover:border-[var(--primary)]/50 transition-colors">
            <div className="p-3 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
              <Terminal size={24} />
            </div>
            <div>
              <h3 className="text-white font-bold text-xl mb-2">Frontend</h3>
              <p className="text-gray-400 text-sm">{t.frontendDesc}</p>
            </div>
          </div>
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm flex items-start gap-4 hover:border-[var(--secondary)]/50 transition-colors">
            <div className="p-3 rounded-lg bg-[var(--secondary)]/10 text-[var(--secondary)]">
              <Code size={24} />
            </div>
            <div>
              <h3 className="text-white font-bold text-xl mb-2">Design</h3>
              <p className="text-gray-400 text-sm">{t.designDesc}</p>
            </div>
          </div>
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm flex items-start gap-4 hover:border-[var(--accent)]/50 transition-colors">
            <div className="p-3 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
              <Cpu size={24} />
            </div>
            <div>
              <h3 className="text-white font-bold text-xl mb-2">Challenge</h3>
              <p className="text-gray-400 text-sm">{t.challengeDesc}</p>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
