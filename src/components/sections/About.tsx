"use client";

import Section from "@/components/Section";
import { Terminal, Code, Cpu } from "lucide-react";

export default function About() {
  return (
    <Section id="about" title="About">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6 text-gray-300 leading-relaxed text-lg">
          <p>
            初めまして、<span className="text-white font-bold">Miiiwa</span>です。
            「面白いを最優先！」をモットーに、日々新しい技術に触れながらプロダクト開発に挑戦している駆け出し学生エンジニア（27卒）です。
          </p>
          <p>
            ただ動くものを作るだけでなく、ユーザーにとって「使ってて楽しい」「デザインがカッコいい」と思えるような体験（UX）を提供することを大切にしています。
          </p>
          <p>
            とにかく新規性重視で、まだこの世にないものを探し求めて、日々を過ごしています！
          </p>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm flex items-start gap-4 hover:border-[var(--primary)]/50 transition-colors">
            <div className="p-3 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
              <Terminal size={24} />
            </div>
            <div>
              <h3 className="text-white font-bold text-xl mb-2">Frontend</h3>
              <p className="text-gray-400 text-sm">React, Next.js を用いたモダンなUI構築</p>
            </div>
          </div>
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm flex items-start gap-4 hover:border-[var(--secondary)]/50 transition-colors">
            <div className="p-3 rounded-lg bg-[var(--secondary)]/10 text-[var(--secondary)]">
              <Code size={24} />
            </div>
            <div>
              <h3 className="text-white font-bold text-xl mb-2">Design</h3>
              <p className="text-gray-400 text-sm">Tailwind CSS, Framer Motion によるリッチな表現</p>
            </div>
          </div>
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm flex items-start gap-4 hover:border-[var(--accent)]/50 transition-colors">
            <div className="p-3 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
              <Cpu size={24} />
            </div>
            <div>
              <h3 className="text-white font-bold text-xl mb-2">Challenge</h3>
              <p className="text-gray-400 text-sm">常に新しい技術や「面白い」アイデアに挑戦</p>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
